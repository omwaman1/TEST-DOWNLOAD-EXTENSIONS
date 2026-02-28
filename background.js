// Background service worker — 10-tab worker pool
// As soon as any tab finishes, a new test is picked up immediately
// This keeps 10 tabs active at ALL times for maximum speed

const AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjVlMzNlZTg2NGI2NTJjMGQxMDkzMjYyZCIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wMy0yOVQwODowOTo0MS44OTIyMjEzNDFaIiwiaWF0IjoiMjAyNi0wMi0yN1QwODowOTo0MS44OTIyMjEzNDFaIiwibmFtZSI6Ik9tIHdhbWFuIiwiZW1haWwiOiJvbXdhbWFuMUBnbWFpbC5jb20iLCJvcmdJZCI6IiIsImhvbWVTdGF0ZUlkIjoiNWY5MTYzYTQyZWM4MjdiMjE4ZGFjZDI5IiwiaXNMTVNVc2VyIjpmYWxzZSwicm9sZXMiOiJzdHVkZW50In0.wfK6yGb3AE_JsSj-KnxYDQUCWvjHBH-5hQ_j1qsQRXkhrzVCiRjb1D4NuNZbr52XYef6gq4F6SyQcQEp2ltQdj8D0Jgj6P4qETzT0SQv6-f2RDgjyngZIRaBK6ruwRSiHfo0L5oQAYBKIpGAfodOKdFzTwOSJNOFX_392zu_xtc";
const TEST_SERIES_SLUG = "maharashtra-talathi";
const TEST_SERIES_ID = "6888656274098861f334fc94";
const LANGUAGE = "English";
const MAX_WORKERS = 10;

let running = false;
let stats = { total: 0, submitted: 0, skipped: 0, failed: 0, progress: 0, running: false, statusText: "" };

// Queue of tests to process
let testQueue = [];
let activeWorkers = 0;
let queueResolve = null; // resolves when all work done

function broadcast(type, data) {
    const msg = { type, ...data };
    chrome.runtime.sendMessage(msg).catch(() => { });
    if (type === "stats") {
        stats = { ...stats, ...data.data, running };
        chrome.storage.local.set({ autoSubmitState: stats });
    }
    if (type === "status") {
        stats.statusText = data.text;
        chrome.storage.local.set({ autoSubmitState: stats });
    }
}

function updateProgress() {
    const done = stats.submitted + stats.skipped + stats.failed;
    const progress = stats.total > 0 ? Math.round((done / stats.total) * 100) : 0;
    broadcast("stats", { data: { submitted: stats.submitted, skipped: stats.skipped, failed: stats.failed, progress } });
    broadcast("status", { text: `Active: ${activeWorkers} tabs | Done: ${done}/${stats.total} | Submitted: ${stats.submitted} | Skipped: ${stats.skipped}` });
}

async function apiFetch(url, useBearer = false) {
    const headers = { source: "testbook", origin: "https://testbook.com", referer: "https://testbook.com/", accept: "application/json" };
    if (useBearer) { headers["authorization"] = `Bearer ${AUTH_TOKEN}`; headers["x-tb-client"] = "web,1.2"; }
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function getSeriesStructure() {
    const proj = JSON.stringify({ details: { id: 1, name: 1, sections: { id: 1, name: 1, subsections: { id: 1, name: 1, paidTestCount: 1, freeTestCount: 1 }, paidTestCount: 1, freeTestCount: 1 } } });
    return apiFetch(`https://api.testbook.com/api/v1/test-series/slug?__projection=${encodeURIComponent(proj)}&url=${TEST_SERIES_SLUG}&branchId=&language=${LANGUAGE}`, true);
}

async function getTestsList(sectionId, subSectionId, skip = 0) {
    const proj = JSON.stringify({ tests: { id: 1, title: 1, progress: 1, hasAccess: 1 } });
    return apiFetch(`https://api.testbook.com/api/v2/test-series/${TEST_SERIES_ID}/tests/details?__projection=${encodeURIComponent(proj)}&testType=all&sectionId=${sectionId}&subSectionId=${subSectionId}&skip=${skip}&limit=50&branchId=&language=${LANGUAGE}`, true);
}

async function checkTestState(testId) {
    try {
        const data = await apiFetch(`https://api-new.testbook.com/api/v2/tests/${testId}/state?auth_code=${AUTH_TOKEN}&X-Tb-Client=web,1.2&language=${LANGUAGE}`);
        return data?.data?.attemptsCompleted > 0;
    } catch { return false; }
}

async function getAllTests() {
    broadcast("status", { text: "Fetching test series structure..." });
    const series = await getSeriesStructure();
    if (!series.success) throw new Error("Failed to fetch series");
    let allTests = [];
    for (const sec of series.data.details.sections) {
        for (const sub of sec.subsections) {
            broadcast("status", { text: `Fetching: ${sec.name} > ${sub.name}...` });
            let skip = 0;
            while (true) {
                const list = await getTestsList(sec.id, sub.id, skip);
                if (list.success && list.data.tests?.length > 0) {
                    for (const t of list.data.tests) allTests.push({ id: t.id, title: t.title });
                    if (list.data.tests.length < 50) break;
                    skip += 50;
                } else break;
            }
            await new Promise(r => setTimeout(r, 200));
        }
    }
    return allTests;
}

// Process one test in a tab — called by the worker pool
function processOneTest(test) {
    return new Promise((resolve) => {
        const url = `https://testbook.com/TS-${TEST_SERIES_SLUG}/tests/${test.id}`;

        chrome.tabs.create({ url, active: false }, (tab) => {
            const tabId = tab.id;
            let settled = false;

            const timeout = setTimeout(() => {
                if (!settled) { settled = true; cleanup(); chrome.tabs.remove(tabId).catch(() => { }); resolve("timeout"); }
            }, 60000);

            function cleanup() {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(handler);
            }

            function handler(msg, sender) {
                if (sender.tab?.id !== tabId) return;
                if (msg.type === "submitResult" && !settled) {
                    settled = true;
                    cleanup();
                    chrome.tabs.remove(tabId).catch(() => { });
                    resolve(msg.result);
                }
                if (msg.type === "pageReady") {
                    chrome.tabs.sendMessage(tabId, { action: "autoSubmit", testId: test.id, title: test.title }).catch(() => { });
                }
            }

            chrome.runtime.onMessage.addListener(handler);
        });
    });
}

// Worker: picks next test from queue, processes it, then picks another
async function worker() {
    while (testQueue.length > 0 && running) {
        const test = testQueue.shift();
        activeWorkers++;
        updateProgress();

        // Quick API check — skip already attempted
        const done = await checkTestState(test.id);
        if (done) {
            stats.skipped++;
            activeWorkers--;
            updateProgress();
            continue;
        }

        // Open tab and submit
        const result = await processOneTest(test);
        if (result === "ok") {
            stats.submitted++;
        } else {
            stats.failed++;
        }
        activeWorkers--;
        updateProgress();
    }
}

async function run() {
    running = true;
    stats = { total: 0, submitted: 0, skipped: 0, failed: 0, progress: 0, running: true, statusText: "" };

    try {
        const tests = await getAllTests();
        stats.total = tests.length;
        broadcast("stats", { data: { total: tests.length } });

        // Fill the queue
        testQueue = [...tests];

        broadcast("status", { text: `Starting ${MAX_WORKERS} workers for ${tests.length} tests...` });

        // Launch MAX_WORKERS workers concurrently
        // Each worker keeps pulling from the queue until it's empty
        const workers = [];
        for (let i = 0; i < MAX_WORKERS; i++) {
            workers.push(worker());
        }

        // Wait for all workers to finish
        await Promise.all(workers);

        broadcast("status", { text: `✅ Done! Submitted: ${stats.submitted} | Skipped: ${stats.skipped} | Failed: ${stats.failed}` });
    } catch (err) {
        broadcast("status", { text: `Error: ${err.message}` });
    }

    running = false;
    stats.running = false;
    chrome.storage.local.set({ autoSubmitState: stats });
    broadcast("done", {});
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "start" && !running) run();
    if (msg.action === "stop") { running = false; testQueue = []; }
});
