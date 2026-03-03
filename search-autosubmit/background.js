// ============================================================
// Search AutoSubmit — Background Service Worker
// ============================================================
// Pre-loaded with Maharashtra socio-religious reform test IDs.
// Just click Start — no searching needed, directly auto-submits.
// ============================================================

const AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjVlMzNlZTg2NGI2NTJjMGQxMDkzMjYyZCIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wNC0wMlQxMjo1NDoxNS4wNjUwOTYzNjRaIiwiaWF0IjoiMjAyNi0wMy0wM1QxMjo1NDoxNS4wNjUwOTYzNjRaIiwibmFtZSI6Ik9tIHdhbWFuIiwiZW1haWwiOiJvbXdhbWFuMUBnbWFpbC5jb20iLCJvcmdJZCI6IiIsImhvbWVTdGF0ZUlkIjoiNWY5MTYzYTQyZWM4MjdiMjE4ZGFjZDI5IiwiaXNMTVNVc2VyIjpmYWxzZSwicm9sZXMiOiJzdHVkZW50In0.dfVMzss0SPofDuXzbHvTaA1yO2xtcIZh3Ll2QK1KOOQUSdsltSB6AY8frRUfYmXyUpM6ROtuQ5coki7xSts6LMYJXnJoKYs6Gk8E6qL0aF-Pj6-aLTafoehK1F6SUArb6jKp2n5aoDpPzwDeFliNlD8nab3gLQfUa2w1jjWiXcU";
const LANGUAGE = "Marathi";
const MAX_WORKERS = 10;

// ============================================================
// PRE-LOADED MAHARASHTRA SAMAJ SUDHARAK TEST IDs
// Collected from Testbook global search, filtered for Maharashtra only
// ============================================================
const TEST_LIST = [
    // --- Socio-Religious Reforms / सामाजिक-धार्मिक सुधारणा ---
    { id: "694bfe4ec6ee7af4301cb042", title: "CT 6: Socio-Religious Reforms/सामाजिक-धार्मिक सुधारणा", seriesId: null },
    { id: "694c153dc6ee7af4301e4396", title: "CT 6: Socio-Religious Reforms/सामाजिक-धार्मिक सुधारणा", seriesId: "6911ddf3ece2a9fae86eb2f4" },
    { id: "6895c5051ec78891f229ace2", title: "CT 6: Indian History (Socio-Religious Reforms/सामाजिक-धार्मिक सुधारणा)", seriesId: null },
    { id: "6336e20c9336c6bdc95adf6b", title: "CT 14: Modern History (Socio-religious Reforms सामाजिक-धार्मिक सुधारणा)", seriesId: null },
    { id: "65eaefeb7abccedddeb2a40b", title: "CT 19: Modern History (Socio-religious Reforms सामाजिक-धार्मिक सुधारणा)", seriesId: null },

    // --- Maharashtra-specific Socio-Religious Movements ---
    { id: "691b1e74e7e93cd9dd99c62e", title: "CT 2: Socio - Religious Reform Movements in Maharashtra", seriesId: "691b2251687088e2275b261a" },
    { id: "690872dc438b5e631ac79f68", title: "CT 2: Socio - Religious Reform Movements in Maharashtra", seriesId: null },
    { id: "688863f3bcbb9e9fea607da0", title: "CT 2: Socio - Religious Reform Movements in Maharashtra (19th/20th CE)", seriesId: "6888656274098861f334fc94" },

    // --- Maharashtra GK (Socio-Religious Movements) ---
    { id: "694c157f237efc89a33f7d00", title: "CT 2: Maharashtra GK (Socio-Religious Movements/सामाजिक-धार्मिक आंदोलने)", seriesId: null },
    { id: "694bfe9c96219a8729fb3332", title: "CT 2: Maharashtra GK (Socio-Religious Movements/सामाजिक-धार्मिक आंदोलने)", seriesId: null },
    { id: "682c611cc4cc481e95eca3e8", title: "CT 2: Maharashtra GK (Socio - Religious Movements)", seriesId: "682d6c00d8f5a1ca0b23defd" },
    { id: "6912fc46d54488a97a686068", title: "CT 2: Maharashtra GK (Socio - Religious Movements सामाजिक - धार्मिक चळवळी)", seriesId: null },

    // --- Social Reformer in Maharashtra ---
    { id: "646de2563360992f16140898", title: "ST 20: Social Reformer in Maharashtra (महाराष्ट्रातील सामाजिक सुधारक II)", seriesId: "646c843fb92a0fa3443588dc" },
    { id: "646c797a868edf05bf6c1e3b", title: "ST 6: Social Reformer in Maharashtra (महाराष्ट्रातील सामाजिक सुधारक)", seriesId: "646c843fb92a0fa3443588dc" },

    // --- Modern History Socio-Religious Reforms ---
    { id: "6284ca7015af3343c66c7f37", title: "CT 37: Modern History (Socio-Religious reforms I)", seriesId: "6284e1e3b6f66a4115e2c6a9" },
    { id: "6284ca7100db24d13379abeb", title: "CT 38: Modern History (Socio-Religious reforms II)", seriesId: "6284e1e3b6f66a4115e2c6a9" },
    { id: "62a744d6d17819c36dc011bd", title: "CT 39: Modern History (Socio-Religious Reforms)", seriesId: "61e7a7a962e37eceeb77314c" },
    { id: "62f1124fb1cf71f9181399aa", title: "CT 14: Modern History (Socio-Religious Reforms)", seriesId: "62f256cc770d14e97c49a194" },
    { id: "682c60e9c6377341424b97ee", title: "CT 17: Modern History (Socio-Religious Movements)", seriesId: "682d6c00d8f5a1ca0b23defd" },
    { id: "685a69b16f956abd92d97fb3", title: "CT 8: Modern History (Socio-Religious Movements)", seriesId: null },
    { id: "6752f25cf90f75b5e8b88250", title: "CT 13: History (Socio & Religious Reform Movements)", seriesId: "6752f5b96006cd633ad4913e" },
    { id: "65c5d69d255f77bd6c64dee1", title: "CT 13: History (Socio & Religious Reform Movements)", seriesId: "619752a0543cf87490b71001" },

    // --- General Socio-Religious Reform tests ---
    { id: "68a9c30b88a2d3bfc1b69ceb", title: "CT 25: Socio - Religious Reform", seriesId: null },
    { id: "690de0ab92ddcce61344d945", title: "CT 8: Socio-Religious Movements", seriesId: null },
    { id: "6985f4b7cebd9b15bcbfd692", title: "CT 17: Socio-Religious Reforms", seriesId: null },
    { id: "67ac7f2ca6750398e4c60a9f", title: "CT 21: Socio Religious Reforms", seriesId: null },
    { id: "6888bdd5f72b061e9dc33220", title: "CT 15: Socio-Religious Reforms", seriesId: null },
    { id: "65fc48742e573aaad11a94ae", title: "CT 25: History (Socio Religious Reforms)", seriesId: null },
    { id: "666023eeb75129f86a47850b", title: "CT 3: History (Socio-Religious Reforms)", seriesId: null },
    { id: "67c999be31a7004b44afc563", title: "Modern India: Socio- Religious Reform Movement", seriesId: null },
    { id: "670016ed3ce9ded402705bd8", title: "CT 16: History (Socio Religious Reforms)", seriesId: null },
    { id: "60367b97f56d237ea62f4ee9", title: "Socio - Religious Reform", seriesId: null },
    { id: "66796e6aa95785fc8ea7f68f", title: "CT 1: Socio-Religious Movements (सामाजिक-धार्मिक चळवळी)", seriesId: null },
];

// Cache: seriesId → slug
const seriesSlugs = {};

let running = false;
let stats = { total: 0, submitted: 0, skipped: 0, failed: 0, progress: 0, running: false, statusText: "" };
let testQueue = [];
let activeWorkers = 0;

function broadcast(type, data) {
    const msg = { type, ...data };
    chrome.runtime.sendMessage(msg).catch(() => { });
    if (type === "stats") { stats = { ...stats, ...data.data, running }; chrome.storage.local.set({ autoSubmitState: stats }); }
    if (type === "status") { stats.statusText = data.text; chrome.storage.local.set({ autoSubmitState: stats }); }
}

function updateProgress() {
    const done = stats.submitted + stats.skipped + stats.failed;
    const progress = stats.total > 0 ? Math.round((done / stats.total) * 100) : 0;
    broadcast("stats", { data: { submitted: stats.submitted, skipped: stats.skipped, failed: stats.failed, progress, total: stats.total } });
    broadcast("status", { text: `Active: ${activeWorkers} tabs | Done: ${done}/${stats.total} | ✓${stats.submitted} ⊘${stats.skipped} ✗${stats.failed}` });
}

async function apiFetch(url) {
    const headers = { source: "testbook", origin: "https://testbook.com", referer: "https://testbook.com/", accept: "application/json" };
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// --- CHECK IF TEST ALREADY SUBMITTED ---
async function checkTestState(testId) {
    try {
        const data = await apiFetch(`https://api-new.testbook.com/api/v2/tests/${testId}/state?auth_code=${AUTH_TOKEN}&X-Tb-Client=web,1.2&language=${LANGUAGE}`);
        return data?.data?.attemptsCompleted > 0;
    } catch { return false; }
}

// --- LOOK UP TEST SERIES SLUG FROM ID ---
async function getSeriesSlug(seriesId) {
    if (!seriesId) return null;
    if (seriesSlugs[seriesId]) return seriesSlugs[seriesId];
    try {
        const proj = JSON.stringify({ slug: 1 });
        const data = await apiFetch(
            `https://api.testbook.com/api/v1/test-series/${seriesId}?__projection=${encodeURIComponent(proj)}&auth_code=${AUTH_TOKEN}&X-Tb-Client=web,1.2`
        );
        if (data.success && data.data?.slug) {
            seriesSlugs[seriesId] = data.data.slug;
            return data.data.slug;
        }
    } catch { }
    return null;
}

// --- BUILD CORRECT TEST URL ---
async function getTestUrl(test) {
    // Try to get slug from seriesId
    if (test.seriesId) {
        const slug = await getSeriesSlug(test.seriesId);
        if (slug) return `https://testbook.com/TS-${slug}/tests/${test.id}`;
    }
    // Fallback: use test-series ID directly in URL
    if (test.seriesId) {
        return `https://testbook.com/TS-${test.seriesId}/tests/${test.id}`;
    }
    // Last resort: try the generic test URL pattern
    return `https://testbook.com/test-series/tests/${test.id}`;
}

// --- OPEN TAB + AUTO-SUBMIT ---
function processOneTest(test, url) {
    return new Promise((resolve) => {
        chrome.tabs.create({ url, active: false }, (tab) => {
            const tabId = tab.id;
            let settled = false;
            const timeout = setTimeout(() => {
                if (!settled) { settled = true; cleanup(); chrome.tabs.remove(tabId).catch(() => { }); resolve("timeout"); }
            }, 120000);

            function cleanup() { clearTimeout(timeout); chrome.runtime.onMessage.removeListener(handler); }
            function handler(msg, sender) {
                if (sender.tab?.id !== tabId) return;
                if (msg.type === "submitResult" && !settled) {
                    settled = true; cleanup();
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

// --- WORKER ---
async function worker() {
    while (testQueue.length > 0 && running) {
        const test = testQueue.shift();
        activeWorkers++;
        updateProgress();

        const done = await checkTestState(test.id);
        if (done) {
            stats.skipped++;
            activeWorkers--;
            updateProgress();
            continue;
        }

        // Build correct URL before opening tab
        const url = await getTestUrl(test);
        const result = await processOneTest(test, url);
        if (result === "ok") stats.submitted++;
        else stats.failed++;
        activeWorkers--;
        updateProgress();
    }
}

// --- MAIN ---
async function run() {
    running = true;
    stats = { total: TEST_LIST.length, submitted: 0, skipped: 0, failed: 0, progress: 0, running: true, statusText: "" };

    try {
        broadcast("stats", { data: { total: TEST_LIST.length } });
        broadcast("status", { text: `Resolving test series slugs...` });

        // Pre-fetch all unique series slugs
        const uniqueSeriesIds = [...new Set(TEST_LIST.map(t => t.seriesId).filter(Boolean))];
        for (const sid of uniqueSeriesIds) {
            await getSeriesSlug(sid);
            await new Promise(r => setTimeout(r, 200));
        }

        broadcast("status", { text: `Ready! ${TEST_LIST.length} tests, ${uniqueSeriesIds.length} series resolved. Starting ${MAX_WORKERS} workers...` });
        broadcast("testList", { tests: TEST_LIST });

        testQueue = [...TEST_LIST];

        // Launch workers with stagger
        const workers = [];
        for (let i = 0; i < MAX_WORKERS; i++) {
            workers.push(new Promise(resolve => setTimeout(() => worker().then(resolve), i * 2000)));
        }
        await Promise.all(workers);

        broadcast("status", { text: `✅ Done! Submitted: ${stats.submitted} | Already Done: ${stats.skipped} | Failed: ${stats.failed}` });
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
