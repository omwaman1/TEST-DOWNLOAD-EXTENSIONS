// ============================================================
// Maharashtra Samaj Sudharak — Download + PDF (Marathi)
// ============================================================
// Downloads 33 pre-identified tests, converts to PDF.
// Run: node socio-religious-downloader.mjs
// ============================================================

import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer-core";

// --- CONFIGURATION ---
const AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjVlMzNlZTg2NGI2NTJjMGQxMDkzMjYyZCIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wNC0wMlQxMjo1NDoxNS4wNjUwOTYzNjRaIiwiaWF0IjoiMjAyNi0wMy0wM1QxMjo1NDoxNS4wNjUwOTYzNjRaIiwibmFtZSI6Ik9tIHdhbWFuIiwiZW1haWwiOiJvbXdhbWFuMUBnbWFpbC5jb20iLCJvcmdJZCI6IiIsImhvbWVTdGF0ZUlkIjoiNWY5MTYzYTQyZWM4MjdiMjE4ZGFjZDI5IiwiaXNMTVNVc2VyIjpmYWxzZSwicm9sZXMiOiJzdHVkZW50In0.dfVMzss0SPofDuXzbHvTaA1yO2xtcIZh3Ll2QK1KOOQUSdsltSB6AY8frRUfYmXyUpM6ROtuQ5coki7xSts6LMYJXnJoKYs6Gk8E6qL0aF-Pj6-aLTafoehK1F6SUArb6jKp2n5aoDpPzwDeFliNlD8nab3gLQfUa2w1jjWiXcU";
const LANGUAGE = "Marathi";
const OUTPUT_DIR = "c:\\Users\\Admin\\Desktop\\Maharashtra-Samaj-Sudharak";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WORKERS = 5;
const DELAY_MS = 1500;

// --- PRE-LOADED TEST IDs ---
const TEST_LIST = [
    { id: "694bfe4ec6ee7af4301cb042", title: "CT 6: Socio-Religious Reforms - सामाजिक-धार्मिक सुधारणा" },
    { id: "694c153dc6ee7af4301e4396", title: "CT 6: Socio-Religious Reforms - सामाजिक-धार्मिक सुधारणा (2)" },
    { id: "6895c5051ec78891f229ace2", title: "CT 6: Indian History - Socio-Religious Reforms" },
    { id: "6336e20c9336c6bdc95adf6b", title: "CT 14: Modern History - Socio-religious Reforms" },
    { id: "65eaefeb7abccedddeb2a40b", title: "CT 19: Modern History - Socio-religious Reforms" },
    { id: "691b1e74e7e93cd9dd99c62e", title: "CT 2: Socio-Religious Reform Movements in Maharashtra" },
    { id: "690872dc438b5e631ac79f68", title: "CT 2: Socio-Religious Reform Movements in Maharashtra (2)" },
    { id: "688863f3bcbb9e9fea607da0", title: "CT 2: Socio-Religious Reforms 19th-20th CE Maharashtra" },
    { id: "694c157f237efc89a33f7d00", title: "CT 2: Maharashtra GK - Socio-Religious Movements" },
    { id: "694bfe9c96219a8729fb3332", title: "CT 2: Maharashtra GK - Socio-Religious Movements (2)" },
    { id: "682c611cc4cc481e95eca3e8", title: "CT 2: Maharashtra GK - Socio-Religious Movements (3)" },
    { id: "6912fc46d54488a97a686068", title: "CT 2: Maharashtra GK - सामाजिक-धार्मिक चळवळी" },
    { id: "646de2563360992f16140898", title: "ST 20: Social Reformer in Maharashtra II" },
    { id: "646c797a868edf05bf6c1e3b", title: "ST 6: Social Reformer in Maharashtra" },
    { id: "6284ca7015af3343c66c7f37", title: "CT 37: Modern History - Socio-Religious reforms I" },
    { id: "6284ca7100db24d13379abeb", title: "CT 38: Modern History - Socio-Religious reforms II" },
    { id: "62a744d6d17819c36dc011bd", title: "CT 39: Modern History - Socio-Religious Reforms" },
    { id: "62f1124fb1cf71f9181399aa", title: "CT 14: Modern History - Socio-Religious Reforms (2)" },
    { id: "682c60e9c6377341424b97ee", title: "CT 17: Modern History - Socio-Religious Movements" },
    { id: "685a69b16f956abd92d97fb3", title: "CT 8: Modern History - Socio-Religious Movements" },
    { id: "6752f25cf90f75b5e8b88250", title: "CT 13: History - Socio Religious Reform Movements" },
    { id: "65c5d69d255f77bd6c64dee1", title: "CT 13: History - Socio Religious Reform Movements (2)" },
    { id: "68a9c30b88a2d3bfc1b69ceb", title: "CT 25: Socio-Religious Reform" },
    { id: "690de0ab92ddcce61344d945", title: "CT 8: Socio-Religious Movements" },
    { id: "6985f4b7cebd9b15bcbfd692", title: "CT 17: Socio-Religious Reforms" },
    { id: "67ac7f2ca6750398e4c60a9f", title: "CT 21: Socio Religious Reforms" },
    { id: "6888bdd5f72b061e9dc33220", title: "CT 15: Socio-Religious Reforms" },
    { id: "65fc48742e573aaad11a94ae", title: "CT 25: History - Socio Religious Reforms" },
    { id: "666023eeb75129f86a47850b", title: "CT 3: History - Socio-Religious Reforms" },
    { id: "67c999be31a7004b44afc563", title: "Modern India - Socio-Religious Reform Movement" },
    { id: "670016ed3ce9ded402705bd8", title: "CT 16: History - Socio Religious Reforms" },
    { id: "60367b97f56d237ea62f4ee9", title: "Socio-Religious Reform" },
    { id: "66796e6aa95785fc8ea7f68f", title: "CT 1: Socio-Religious Movements - सामाजिक-धार्मिक चळवळी" },
];

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

function showProgress(testTitle, status) {
    const pct = stats.total > 0 ? Math.round(((stats.done + stats.skipped + stats.failed) / stats.total) * 100) : 0;
    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% | ✓${stats.done} ⊘${stats.skipped} ✗${stats.failed} | ${status}: ${testTitle.substring(0, 40).padEnd(40)}`);
}

// --- API ---
async function apiFetch(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: {
                    source: "testbook",
                    origin: "https://testbook.com",
                    referer: "https://testbook.com/",
                    accept: "application/json",
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        } catch (e) {
            if (i === retries - 1) throw e;
            await sleep(2000);
        }
    }
}

async function getTestQuestions(testId) {
    return apiFetch(`https://api-new.testbook.com/api/v2/tests/${testId}?auth_code=${AUTH_TOKEN}&X-Tb-Client=web,1.2&language=${LANGUAGE}&client=web&testLang=mr&beforeServe=false`);
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

        const ansLabel = correctOpt ? `उत्तर: ${optLabels[parseInt(correctOpt) - 1] || correctOpt}` : "";
        const solSection = solText
            ? `<div class="solution"><div class="solution-title">📖 स्पष्टीकरण ${ansLabel ? `(${ansLabel})` : ""}</div>${solText}</div>`
            : (ansLabel ? `<div class="solution"><div class="solution-title">${ansLabel}</div></div>` : "");

        questionsHtml += `<div class="question-block"><span class="question-number">प्र${idx + 1}</span><div class="question-text">${qText}</div><div class="options">${optionsHtml}</div>${solSection}</div>`;
    });

    return `<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8">
<title>${testTitle}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Devanagari','Inter',sans-serif;background:#fff;color:#1a1a2e;line-height:1.5;font-size:12px}
.container{width:100%;margin:0 auto;padding:10px 18px}
.header{text-align:center;padding:8px 0;border-bottom:2px solid #6c5ce7;margin-bottom:12px}
.header h1{font-size:15px;color:#2d3436;font-weight:700;margin-bottom:2px}
.header .meta{font-size:10px;color:#636e72}
.question-block{margin-bottom:8px;padding:8px 10px;border:1px solid #ddd;border-radius:5px;page-break-inside:avoid}
.question-number{display:inline-block;background:#6c5ce7;color:#fff;font-weight:700;font-size:10px;padding:1px 8px;border-radius:10px;margin-bottom:3px}
.question-text{font-size:12px;font-weight:500;margin-bottom:5px;line-height:1.4}
.question-text p{margin-bottom:2px}
.question-text img{max-width:100%;height:auto}
.options{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;padding:0}
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
        <div class="meta">प्रश्न: ${allQuestions.length} | एकूण गुण: ${totalMarks} | कालावधी: ${duration} मिनिटे</div>
    </div>
${questionsHtml}
    <div class="footer">महाराष्ट्र समाज सुधारक — Testbook</div>
</div>
</body>
</html>`;
}

// --- WORKER: Download + PDF ---
async function processTest(browser, test, dir) {
    const title = test.title;
    const pdfPath = join(dir, safeName(title) + ".pdf");

    if (existsSync(pdfPath)) {
        stats.skipped++;
        showProgress(title, "SKIP");
        return;
    }

    try {
        showProgress(title, "DL");
        const testData = await getTestQuestions(test.id);
        await sleep(DELAY_MS);
        const answersData = await getTestAnswers(test.id);
        await sleep(DELAY_MS);

        if (!testData.success) {
            stats.failed++;
            showProgress(title, "FAIL");
            return;
        }

        const html = generateHtml(testData, answersData, title);
        const htmlPath = join(dir, safeName(title) + ".html");
        writeFileSync(htmlPath, html, "utf-8");

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

        try { unlinkSync(htmlPath); } catch { }

        stats.done++;
        showProgress(title, "OK ✓");
    } catch (err) {
        stats.failed++;
        showProgress(title, "ERR");
    }
}

// --- WORKER POOL ---
async function workerPool(browser, tasks) {
    let idx = 0;
    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            await processTest(browser, tasks[i], OUTPUT_DIR);
        }
    }
    const workers = [];
    for (let i = 0; i < WORKERS; i++) workers.push(worker());
    await Promise.all(workers);
}

// --- MAIN ---
async function main() {
    console.log("\n=============================================");
    console.log("  महाराष्ट्र समाज सुधारक — Download + PDF");
    console.log(`  Tests: ${TEST_LIST.length} | Language: ${LANGUAGE}`);
    console.log(`  Workers: ${WORKERS} | Output: ${OUTPUT_DIR}`);
    console.log("=============================================\n");

    mkdirSync(OUTPUT_DIR, { recursive: true });
    stats.total = TEST_LIST.length;

    console.log("  [1/3] Launching headless Chrome...");
    const tempProfile = join(OUTPUT_DIR, ".chrome_temp");
    mkdirSync(tempProfile, { recursive: true });

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        userDataDir: tempProfile,
        args: ["--no-sandbox", "--disable-gpu", "--disable-extensions"],
    });
    console.log("         Chrome ready!\n");

    console.log(`  [2/3] Downloading & converting ${TEST_LIST.length} tests...\n`);
    await workerPool(browser, TEST_LIST);

    await browser.close();

    console.log("\n\n=============================================");
    console.log(`  ✅ पूर्ण! (DONE!)`);
    console.log(`  PDFs created: ${stats.done}`);
    console.log(`  Skipped:      ${stats.skipped}`);
    console.log(`  Failed:       ${stats.failed}`);
    console.log(`  Output:       ${OUTPUT_DIR}`);
    console.log("=============================================\n");
}

main().catch((e) => { console.error("\nFatal:", e); process.exit(1); });
