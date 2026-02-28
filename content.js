// Content script — handles FULL test submission flow:
// 1. Click "Start Test" / "Attempt" / "Continue" to enter the test
// 2. Click "Submit Test" to trigger submission
// 3. Click "Submit" in the confirmation popup
// Extended timeouts for slow-loading pages

(function () {
    // Safety check — chrome.runtime can become undefined after extension reload
    function safeSendMessage(msg) {
        try {
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(msg).catch(() => { });
            }
        } catch (e) { }
    }

    function notifyReady() {
        safeSendMessage({ type: "pageReady" });
    }

    // Wait for page to fully load
    if (document.readyState === "complete") {
        setTimeout(notifyReady, 4000);
    } else {
        window.addEventListener("load", () => setTimeout(notifyReady, 4000));
    }

    // Also notify on URL changes (SPA navigation)
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(notifyReady, 3000);
        }
    }, 2000);

    try {
        if (chrome && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((msg) => {
                if (msg.action === "autoSubmit") {
                    autoSubmit(msg.testId, msg.title);
                }
            });
        }
    } catch (e) { }

    function waitMs(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // Click any button matching one of the given texts
    function clickButton(texts, exclude = []) {
        const allBtns = document.querySelectorAll("button, a, div[role='button'], span[role='button']");
        for (const btn of allBtns) {
            const text = btn.textContent.trim().toLowerCase();
            // Skip excluded texts
            if (exclude.some(e => text.includes(e))) continue;
            // Check if any target text matches
            for (const target of texts) {
                if (text === target || text.includes(target)) {
                    console.log("[AutoSubmit] Clicking:", text);
                    btn.click();
                    return true;
                }
            }
        }
        return false;
    }

    async function autoSubmit(testId, title) {
        console.log("[AutoSubmit] Starting for:", title);
        await waitMs(3000);

        // STEP 1: Click "Start Test" / "Attempt" / "Continue" / "Resume"
        // This enters the test interface
        console.log("[AutoSubmit] Step 1: Looking for Start/Attempt button...");
        for (let i = 0; i < 15; i++) {
            const clicked = clickButton(
                ["start test", "attempt", "continue", "resume", "start", "reattempt", "re-attempt"],
                ["close", "cancel", "back", "submit"]
            );
            if (clicked) {
                console.log("[AutoSubmit] Clicked start button, waiting for test to load...");
                await waitMs(8000); // Wait for test interface to load
                break;
            }
            await waitMs(2000);
        }

        // STEP 2: Click "Submit Test"
        console.log("[AutoSubmit] Step 2: Looking for Submit Test button...");
        let submitted = false;
        for (let i = 0; i < 20 && !submitted; i++) {
            const clicked = clickButton(
                ["submit test"],
                ["close", "cancel", "back"]
            );
            if (clicked) {
                console.log("[AutoSubmit] Clicked Submit Test, waiting for popup...");
                await waitMs(3000);

                // STEP 3: Click confirmation "Submit" in popup
                console.log("[AutoSubmit] Step 3: Looking for confirmation Submit...");
                for (let j = 0; j < 10; j++) {
                    // Look for a "Submit" button that is NOT "Submit Test"
                    const allBtns = document.querySelectorAll("button");
                    for (const btn of allBtns) {
                        const text = btn.textContent.trim().toLowerCase();
                        if (text === "submit") {
                            console.log("[AutoSubmit] Clicking confirmation Submit");
                            btn.click();
                            submitted = true;
                            break;
                        }
                    }
                    if (submitted) break;

                    // Also check inside modals/overlays
                    const modals = document.querySelectorAll("[class*='modal'], [class*='Modal'], [class*='dialog'], [class*='Dialog'], [class*='popup'], [class*='overlay'], [role='dialog']");
                    for (const modal of modals) {
                        const btns = modal.querySelectorAll("button");
                        for (const btn of btns) {
                            const text = btn.textContent.trim().toLowerCase();
                            if ((text === "submit" || text.includes("submit")) && !text.includes("close") && !text.includes("cancel")) {
                                console.log("[AutoSubmit] Clicking modal submit:", text);
                                btn.click();
                                submitted = true;
                                break;
                            }
                        }
                        if (submitted) break;
                    }
                    if (submitted) break;
                    await waitMs(1500);
                }
                break; // Exit the Submit Test loop
            }

            // Check if we're already on a result/analysis page
            if (location.href.includes("analysis") || location.href.includes("solutions") || location.href.includes("result")) {
                submitted = true;
                break;
            }

            await waitMs(2000);
        }

        await waitMs(3000);

        const result = submitted ? "ok" : "failed";
        console.log("[AutoSubmit] Result:", result, "for:", title);
        safeSendMessage({ type: "submitResult", result });
    }
})();
