// Content script — event-driven, no fixed delays
// Uses MutationObserver to detect buttons as soon as they appear in DOM

(function () {
    function safeSendMessage(msg) {
        try {
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(msg).catch(() => { });
            }
        } catch (e) { }
    }

    // Wait for an element matching a condition to appear in the DOM
    function waitForElement(matchFn, timeoutMs = 60000) {
        return new Promise((resolve) => {
            // Check if already exists
            const existing = matchFn();
            if (existing) { resolve(existing); return; }

            let resolved = false;
            const observer = new MutationObserver(() => {
                if (resolved) return;
                const el = matchFn();
                if (el) {
                    resolved = true;
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

            // Timeout fallback
            setTimeout(() => {
                if (!resolved) { resolved = true; observer.disconnect(); resolve(null); }
            }, timeoutMs);
        });
    }

    // Find a button by text content
    function findButton(texts, exclude = []) {
        const allBtns = document.querySelectorAll("button, a, div[role='button'], span[role='button']");
        for (const btn of allBtns) {
            const text = btn.textContent.trim().toLowerCase();
            if (exclude.some(e => text.includes(e))) continue;
            for (const target of texts) {
                if (text === target || text.includes(target)) {
                    return btn;
                }
            }
        }
        return null;
    }

    // Notify background as soon as page has a body
    function notifyWhenReady() {
        if (document.body) {
            safeSendMessage({ type: "pageReady" });
        } else {
            document.addEventListener("DOMContentLoaded", () => safeSendMessage({ type: "pageReady" }));
        }
    }
    // Small random delay so not all tabs fire at once
    setTimeout(notifyWhenReady, 1000 + Math.random() * 2000);

    try {
        if (chrome && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((msg) => {
                if (msg.action === "autoSubmit") {
                    autoSubmit(msg.testId, msg.title);
                }
            });
        }
    } catch (e) { }

    async function autoSubmit(testId, title) {
        console.log("[AutoSubmit] Starting for:", title);

        // STEP 1: Wait for "Start Test" / "Attempt" button to appear, then click it
        console.log("[AutoSubmit] Step 1: Waiting for Start/Attempt button...");
        const startBtn = await waitForElement(() =>
            findButton(
                ["start test", "attempt", "continue", "resume", "start", "reattempt", "re-attempt"],
                ["close", "cancel", "back", "submit"]
            ), 30000
        );

        if (startBtn) {
            console.log("[AutoSubmit] Clicking start:", startBtn.textContent.trim());
            startBtn.click();
        } else {
            console.log("[AutoSubmit] No start button found, maybe already in test");
        }

        // STEP 2: Wait for "Submit Test" button to appear, then click it
        console.log("[AutoSubmit] Step 2: Waiting for Submit Test button...");
        const submitTestBtn = await waitForElement(() =>
            findButton(["submit test"], ["close", "cancel", "back"]),
            45000
        );

        if (!submitTestBtn) {
            // Check if we're on result page already
            if (location.href.includes("analysis") || location.href.includes("solutions") || location.href.includes("result")) {
                console.log("[AutoSubmit] Already on result page");
                safeSendMessage({ type: "submitResult", result: "ok" });
                return;
            }
            console.log("[AutoSubmit] Submit Test button not found");
            safeSendMessage({ type: "submitResult", result: "failed" });
            return;
        }

        console.log("[AutoSubmit] Clicking Submit Test");
        submitTestBtn.click();

        // STEP 3: Wait for confirmation "Submit" button in popup
        console.log("[AutoSubmit] Step 3: Waiting for confirmation popup...");
        const confirmBtn = await waitForElement(() => {
            // Look for a button with exactly "Submit" text (not "Submit Test")
            const allBtns = document.querySelectorAll("button");
            for (const btn of allBtns) {
                const text = btn.textContent.trim().toLowerCase();
                if (text === "submit") return btn;
            }
            // Also check modals
            const modals = document.querySelectorAll("[class*='modal'], [class*='Modal'], [class*='dialog'], [class*='Dialog'], [class*='popup'], [class*='overlay'], [role='dialog']");
            for (const modal of modals) {
                const btns = modal.querySelectorAll("button");
                for (const btn of btns) {
                    const text = btn.textContent.trim().toLowerCase();
                    if ((text === "submit" || text.includes("submit")) && !text.includes("close") && !text.includes("cancel") && !text.includes("test")) {
                        return btn;
                    }
                }
            }
            return null;
        }, 15000);

        if (confirmBtn) {
            console.log("[AutoSubmit] Clicking confirmation Submit");
            confirmBtn.click();
            // Wait briefly for navigation
            await new Promise(r => setTimeout(r, 2000));
            safeSendMessage({ type: "submitResult", result: "ok" });
        } else {
            console.log("[AutoSubmit] Confirmation button not found");
            safeSendMessage({ type: "submitResult", result: "failed" });
        }
    }
})();
