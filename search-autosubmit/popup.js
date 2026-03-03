const $ = (id) => document.getElementById(id);

const startBtn = $("startBtn");
const stopBtn = $("stopBtn");
const status = $("status");
const testListBox = $("testListBox");

function log(msg) {
    status.textContent = msg;
}

function updateStats(data) {
    if (data.total !== undefined) $("totalTests").textContent = data.total;
    if (data.submitted !== undefined) $("submitted").textContent = data.submitted;
    if (data.skipped !== undefined) $("skipped").textContent = data.skipped;
    if (data.failed !== undefined) $("failed").textContent = data.failed;
    if (data.progress !== undefined) $("progressFill").style.width = data.progress + "%";
    if (data.searchTotal !== undefined) $("searchTotal").textContent = data.searchTotal;
    if (data.filtered !== undefined) $("filtered").textContent = data.filtered;
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "status") log(msg.text);
    if (msg.type === "stats") updateStats(msg.data);
    if (msg.type === "testList") {
        // Show matched test list
        testListBox.style.display = "block";
        testListBox.innerHTML = msg.tests.map((t, i) =>
            `<div class="test-item">${i + 1}. ${t.title}</div>`
        ).join("");
    }
    if (msg.type === "done") {
        startBtn.disabled = false;
        stopBtn.style.display = "none";
        startBtn.style.display = "block";
    }
});

// Load persisted state
chrome.storage.local.get(["autoSubmitState"], (result) => {
    if (result.autoSubmitState) {
        const s = result.autoSubmitState;
        updateStats(s);
        if (s.running) {
            log(s.statusText || "Running...");
            startBtn.disabled = true;
            stopBtn.style.display = "block";
        } else if (s.statusText) {
            log(s.statusText);
        }
    }
});

startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    stopBtn.style.display = "block";
    log("🔍 Searching Testbook...");
    chrome.runtime.sendMessage({ action: "start" });
});

stopBtn.addEventListener("click", () => {
    stopBtn.style.display = "none";
    startBtn.disabled = false;
    log("Stopping...");
    chrome.runtime.sendMessage({ action: "stop" });
});
