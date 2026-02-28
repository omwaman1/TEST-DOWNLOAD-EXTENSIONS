const $ = (id) => document.getElementById(id);

const startBtn = $("startBtn");
const stopBtn = $("stopBtn");
const status = $("status");

function log(msg) {
    status.textContent = msg;
}

function updateStats(data) {
    if (data.total !== undefined) $("totalTests").textContent = data.total;
    if (data.submitted !== undefined) $("submitted").textContent = data.submitted;
    if (data.skipped !== undefined) $("skipped").textContent = data.skipped;
    if (data.failed !== undefined) $("failed").textContent = data.failed;
    if (data.progress !== undefined) $("progressFill").style.width = data.progress + "%";
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "status") log(msg.text);
    if (msg.type === "stats") updateStats(msg.data);
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
    log("Starting...");
    chrome.runtime.sendMessage({ action: "start" });
});

stopBtn.addEventListener("click", () => {
    stopBtn.style.display = "none";
    startBtn.disabled = false;
    log("Stopping...");
    chrome.runtime.sendMessage({ action: "stop" });
});
