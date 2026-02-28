// ============================================================
// Testbook All-in-One: Download + PDF (Multi-threaded)
// ============================================================
// Downloads tests, converts to PDF, deletes HTML — all at once
// Run: "C:\Program Files\nodejs\node.exe" download.mjs all
// ============================================================

import { writeFileSync, mkdirSync, existsSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer-core";

// --- CONFIGURATION ---
const AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjVlMzNlZTg2NGI2NTJjMGQxMDkzMjYyZCIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wMy0yOVQwODowOTo0MS44OTIyMjEzNDFaIiwiaWF0IjoiMjAyNi0wMi0yN1QwODowOTo0MS44OTIyMjEzNDFaIiwibmFtZSI6Ik9tIHdhbWFuIiwiZW1haWwiOiJvbXdhbWFuMUBnbWFpbC5jb20iLCJvcmdJZCI6IiIsImhvbWVTdGF0ZUlkIjoiNWY5MTYzYTQyZWM4MjdiMjE4ZGFjZDI5IiwiaXNMTVNVc2VyIjpmYWxzZSwicm9sZXMiOiJzdHVkZW50In0.wfK6yGb3AE_JsSj-KnxYDQUCWvjHBH-5hQ_j1qsQRXkhrzVCiRjb1D4NuNZbr52XYef6gq4F6SyQcQEp2ltQdj8D0Jgj6P4qETzT0SQv6-f2RDgjyngZIRaBK6ruwRSiHfo0L5oQAYBKIpGAfodOKdFzTwOSJNOFX_392zu_xtc";
const TEST_SERIES_SLUG = "maharashtra-zilla-parishad";
const TEST_SERIES_ID = "6516e1f501475392049806b5";
const LANGUAGE = "English";
const OUTPUT_DIR = "c:\\Users\\Admin1\\Desktop\\T\\downloads";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WORKERS = 5; // concurrent downloads + PDF conversions
const DELAY_MS = 1500;

// --- HELPERS ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
        .replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
        .replace(/&lsquo;/g, "\u2018").replace(/&rsquo;/g, "\u2019")
        .replace(/&ldquo;/g, "\u201C").replace(/&rdquo;/g, "\u201D")
        .replace(/&times;/g, "×").replace(/&zwj;/g, "\u200D").replace(/&zwnj;/g, "\u200C");
}

function safeName(str) {
    return str.replace(/[\\/:*?"<>|]/g, "_").trim();
}

// --- PROGRESS ---
let stats = { total: 0, done: 0, skipped: 0, failed: 0 };
let failedTests = [];

function showProgress(testTitle, status) {
    const pct = stats.total > 0 ? Math.round(((stats.done + stats.skipped + stats.failed) / stats.total) * 100) : 0;
    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% | ✓${stats.done} ⊘${stats.skipped} ✗${stats.failed} | ${status}: ${testTitle.substring(0, 40).padEnd(40)}`);
}

// --- API ---
async function apiFetch(url, host = "api-new") {
    const headers = {
        source: "testbook", origin: "https://testbook.com",
        referer: "https://testbook.com/", accept: "application/json",
    };
    if (host === "api") {
        headers["authorization"] = `Bearer ${AUTH_TOKEN}`;
        headers["x-tb-client"] = "web,1.2";
    }
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function getSeriesStructure() {
    const proj = JSON.stringify({
        details: { id: 1, name: 1, sections: { id: 1, name: 1, subsections: { id: 1, name: 1, paidTestCount: 1, freeTestCount: 1 }, paidTestCount: 1, freeTestCount: 1 } },
    });
    return apiFetch(`https://api.testbook.com/api/v1/test-series/slug?__projection=${encodeURIComponent(proj)}&url=${TEST_SERIES_SLUG}&branchId=&language=${LANGUAGE}`, "api");
}

async function getTestsList(sectionId, subSectionId, skip = 0, limit = 50) {
    const proj = JSON.stringify({ tests: { id: 1, title: 1, questionCount: 1, hasAccess: 1, isFree: 1, progress: 1 } });
    return apiFetch(`https://api.testbook.com/api/v2/test-series/${TEST_SERIES_ID}/tests/details?__projection=${encodeURIComponent(proj)}&testType=all&sectionId=${sectionId}&subSectionId=${subSectionId}&skip=${skip}&limit=${limit}&branchId=&language=${LANGUAGE}`, "api");
}

async function getTestQuestions(testId) {
    return apiFetch(`https://api-new.testbook.com/api/v2/tests/${testId}?auth_code=${AUTH_TOKEN}&X-Tb-Client=web,1.2&language=${LANGUAGE}&client=web&testLang=en&beforeServe=false`);
}

async function getTestAnswers(testId) {
    try {
        return await apiFetch(`https://api-new.testbook.com/api/v2/tests/${testId}/answers?auth_code=${AUTH_TOKEN}&X-Tb-Client=web,1.2&language=${LANGUAGE}&attemptNo=1`);
    } catch { return null; }
}

// --- HTML GENERATOR ---
function generateHtml(testData, answersData, testTitle) {
    const sections = testData.data.sections;
    const answers = answersData?.data || {};
    const duration = Math.round(testData.data.duration / 60);
    let allQuestions = [];
    for (const sec of sections) allQuestions.push(...sec.questions);
    const totalMarks = allQuestions.reduce((s, q) => s + q.posMarks, 0);
    const optLabels = ["A", "B", "C", "D", "E", "F"];

    let questionsHtml = "";
    allQuestions.forEach((q, idx) => {
        const qId = q._id;
        const qText = decodeHtml(q.mr?.value || q.en?.value || "");
        const ansObj = answers[qId];
        const correctOpt = ansObj?.correctOption || "";
        const solText = decodeHtml(ansObj?.sol?.mr?.value || ansObj?.sol?.en?.value || "");

        let optionsHtml = "";
        const options = q.mr?.options || q.en?.options || [];
        options.forEach((opt, oi) => {
            const label = optLabels[oi] || (oi + 1).toString();
            const optText = decodeHtml(opt.value || "");
            optionsHtml += `<div class="option"><span class="option-label">${label}</span><span class="option-text">${optText}</span></div>`;
        });

        const ansLabel = correctOpt ? `Ans: ${optLabels[parseInt(correctOpt) - 1] || correctOpt}` : "";
        const solSection = solText
            ? `<div class="solution"><div class="solution-title">📖 Solution ${ansLabel ? `(${ansLabel})` : ""}</div>${solText}</div>`
            : (ansLabel ? `<div class="solution"><div class="solution-title">${ansLabel}</div></div>` : "");

        questionsHtml += `<div class="question-block"><span class="question-number">Q${idx + 1}</span><div class="question-text">${qText}</div><div class="options">${optionsHtml}</div>${solSection}</div>`;
    });

    return `<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8">
<title>${testTitle}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter','Noto Sans Devanagari',sans-serif;background:#fff;color:#1a1a2e;line-height:1.5;font-size:12px}
.container{width:100%;margin:0 auto;padding:10px 18px}
.header{text-align:center;padding:8px 0;border-bottom:2px solid #6c5ce7;margin-bottom:12px}
.header h1{font-size:15px;color:#2d3436;font-weight:700;margin-bottom:2px}
.header .meta{font-size:10px;color:#636e72}
.question-block{margin-bottom:8px;padding:8px 10px;border:1px solid #ddd;border-radius:5px;page-break-inside:avoid}
.question-number{display:inline-block;background:#6c5ce7;color:#fff;font-weight:700;font-size:10px;padding:1px 8px;border-radius:10px;margin-bottom:3px}
.question-text{font-size:12px;font-weight:500;margin-bottom:5px;line-height:1.4}
.question-text p{margin-bottom:2px}
.question-text img{max-width:100%;height:auto}
.options{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:0}
.option{padding:3px 6px;border-radius:4px;font-size:11px;border:1px solid #e9ecef;display:flex;align-items:flex-start;gap:5px}
.option-label{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:50%;background:#e9ecef;font-weight:700;font-size:9px;flex-shrink:0}
.option-text{flex:1}
.option-text p{margin:0;display:inline}
.option-text img{max-width:100%;height:auto}
.solution{margin-top:5px;padding:5px 8px;background:#f0f8ff;border-left:3px solid #4a90d9;border-radius:0 4px 4px 0;font-size:11px;line-height:1.4}
.solution-title{font-weight:700;color:#2c5282;margin-bottom:2px;font-size:11px}
.solution p{margin-bottom:2px}
.solution img{max-width:100%;height:auto}
.solution ol,.solution ul{margin-left:14px;margin-bottom:2px}
.footer{text-align:center;padding:6px 0;border-top:1px solid #e9ecef;margin-top:8px;font-size:9px;color:#adb5bd}
@media print{body{background:#fff}.container{padding:5px 8px}.question-block{break-inside:avoid}}
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>${testTitle}</h1>
        <div class="meta">Questions: ${allQuestions.length} | Total Marks: ${totalMarks} | Duration: ${duration} min</div>
    </div>
${questionsHtml}
    <div class="footer">Downloaded from Testbook | ${TEST_SERIES_SLUG}</div>
</div>
</body>
</html>`;
}

// --- WORKER: Download + PDF + Cleanup ---
async function processTest(browser, test, dir) {
    const title = test.title;
    const pdfPath = join(dir, safeName(title) + ".pdf");

    // Skip if PDF already exists
    if (existsSync(pdfPath)) {
        stats.skipped++;
        showProgress(title, "SKIP");
        return;
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            showProgress(title, attempt > 1 ? `RETRY${attempt}` : "DL");

            // 1. Download test data + answers
            const testData = await getTestQuestions(test.id);
            await sleep(DELAY_MS);
            const answersData = await getTestAnswers(test.id);
            await sleep(DELAY_MS);

            if (!testData.success) {
                if (attempt === MAX_RETRIES) {
                    stats.failed++;
                    failedTests.push(`${title} (ID: ${test.id}) — API returned success=false`);
                    showProgress(title, "FAIL");
                }
                await sleep(3000);
                continue;
            }

            // 2. Generate HTML
            const html = generateHtml(testData, answersData, title);
            const htmlPath = join(dir, safeName(title) + ".html");
            writeFileSync(htmlPath, html, "utf-8");

            // 3. Convert HTML → PDF
            showProgress(title, "PDF");
            const page = await browser.newPage();
            try {
                await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 30000 });
                await page.pdf({
                    path: pdfPath,
                    format: "A4",
                    margin: { top: "10mm", bottom: "10mm", left: "5mm", right: "5mm" },
                    printBackground: true,
                });
            } finally {
                await page.close().catch(() => { });
            }

            // 4. Delete HTML
            try { unlinkSync(htmlPath); } catch { }

            stats.done++;
            showProgress(title, "OK ✓");
            return; // Success! Break out of retry loop
        } catch (err) {
            if (attempt === MAX_RETRIES) {
                stats.failed++;
                failedTests.push(`${title} (ID: ${test.id}) — ${err.message}`);
                showProgress(title, "ERR");
            } else {
                await sleep(3000 * attempt); // Increasing backoff
            }
        }
    }
}

// --- WORKER POOL ---
async function workerPool(browser, tasks) {
    let idx = 0;

    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            const task = tasks[i];
            const dir = join(OUTPUT_DIR, safeName(task.secName), safeName(task.subName));
            mkdirSync(dir, { recursive: true });
            await processTest(browser, task, dir);
        }
    }

    const workers = [];
    for (let i = 0; i < WORKERS; i++) workers.push(worker());
    await Promise.all(workers);
}

// --- MAIN ---
async function main() {
    console.log("\n=============================================");
    console.log("  Testbook Download + PDF (Multi-threaded)");
    console.log(`  Workers: ${WORKERS} concurrent`);
    console.log("=============================================\n");

    mkdirSync(OUTPUT_DIR, { recursive: true });

    // 1. Get structure
    console.log("  [1/4] Fetching test series structure...");
    const series = await getSeriesStructure();
    if (!series.success) { console.error("ERROR!"); process.exit(1); }
    const sections = series.data.details.sections;
    console.log(`         ${series.data.details.name} — ${sections.length} sections\n`);

    // 2. Get all tests
    console.log("  [2/4] Fetching test lists...");
    let allTasks = [];

    const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
    let sectionsToProcess = sections;

    if (args[0] !== "all" && args[0]) {
        const si = parseInt(args[0]) - 1;
        if (si >= 0 && si < sections.length) sectionsToProcess = [sections[si]];
    }

    for (const sec of sectionsToProcess) {
        for (const sub of sec.subsections) {
            let skip = 0;
            while (true) {
                const list = await getTestsList(sec.id, sub.id, skip, 50);
                if (list.success && list.data.tests?.length > 0) {
                    for (const t of list.data.tests) {
                        allTasks.push({ id: t.id, title: t.title, secName: sec.name, subName: sub.name });
                    }
                    if (list.data.tests.length < 50) break;
                    skip += 50;
                    await sleep(500);
                } else break;
            }
        }
    }

    stats.total = allTasks.length;
    console.log(`         Found ${allTasks.length} tests\n`);

    // 3. Launch browser for PDF conversion
    console.log("  [3/4] Launching headless Chrome for PDF...");
    const tempProfile = join(OUTPUT_DIR, ".chrome_temp");
    mkdirSync(tempProfile, { recursive: true });

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        userDataDir: tempProfile,
        args: ["--no-sandbox", "--disable-gpu", "--disable-extensions"],
    });
    console.log("         Chrome ready!\n");

    // 4. Process with worker pool
    console.log(`  [4/4] Processing ${allTasks.length} tests (${WORKERS} workers)...\n`);
    await workerPool(browser, allTasks);

    await browser.close();

    console.log("\n\n=============================================");
    console.log(`  ✅ DONE!`);
    console.log(`  PDFs created: ${stats.done}`);
    console.log(`  Skipped:      ${stats.skipped}`);
    console.log(`  Failed:       ${stats.failed}`);
    console.log(`  Output:       ${OUTPUT_DIR}`);
    console.log("=============================================\n");

    if (failedTests.length > 0) {
        console.log("\n  ❌ FAILED TESTS:");
        failedTests.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
        writeFileSync(join(OUTPUT_DIR, "failed.txt"), failedTests.join("\n"), "utf-8");
        console.log(`\n  Saved to: ${join(OUTPUT_DIR, "failed.txt")}\n`);
    }
}

main().catch((e) => { console.error("\nFatal:", e); process.exit(1); });

