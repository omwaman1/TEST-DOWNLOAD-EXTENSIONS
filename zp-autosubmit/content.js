// Content script — runs on testbook.com pages
// Finds and clicks Submit button, then confirms the popup
// Extended timeouts for slow-loading pages

(function () {
    function notifyReady() {
        chrome.runtime.sendMessage({ type: "pageReady" }).catch(() => { });
    }

    // Wait longer for page to fully load (5 seconds after load)
    if (document.readyState === "complete") {
        setTimeout(notifyReady, 5000);
    } else {
        window.addEventListener("load", () => setTimeout(notifyReady, 5000));
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "autoSubmit") {
            autoSubmit(msg.testId, msg.title);
        }
    });

    function waitMs(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function findButtonByText(searchText, container = document) {
        const allClickable = container.querySelectorAll("button, a, div[role='button'], span[role='button']");
        for (const el of allClickable) {
            const text = el.textContent.trim().toLowerCase();
            if (text === searchText.toLowerCase() || text.includes(searchText.toLowerCase())) {
                if (text.includes("close") || text.includes("cancel")) continue;
                return el;
            }
        }
        return null;
    }

    async function autoSubmit(testId, title) {
        console.log("[AutoSubmit] Starting for:", title);

        // Wait longer for test page to fully render
        await waitMs(8000);

        let submitted = false;

        // STEP 1: Find and click "Submit Test" — more attempts, longer waits
        for (let attempt = 0; attempt < 20 && !submitted; attempt++) {
            await waitMs(3000);

            const submitBtn = findButtonByText("Submit Test") || findButtonByText("submit");
            if (submitBtn) {
                console.log("[AutoSubmit] Clicking main Submit button");
                submitBtn.click();
                await waitMs(3000);

                // STEP 2: Handle confirmation popup
                for (let popupAttempt = 0; popupAttempt < 10; popupAttempt++) {
                    await waitMs(1500);

                    const allButtons = document.querySelectorAll("button");
                    for (const btn of allButtons) {
                        const text = btn.textContent.trim().toLowerCase();
                        if (text === "submit") {
                            console.log("[AutoSubmit] Clicking popup Submit button");
                            btn.click();
                            submitted = true;
                            break;
                        }
                    }
                    if (submitted) break;

                    // Also check inside modals
                    const overlays = document.querySelectorAll("[class*='modal'], [class*='dialog'], [class*='popup'], [class*='overlay'], [class*='Modal']");
                    for (const overlay of overlays) {
                        const btns = overlay.querySelectorAll("button");
                        for (const btn of btns) {
                            const text = btn.textContent.trim().toLowerCase();
                            if (text === "submit" || text.includes("submit")) {
                                if (text.includes("close") || text.includes("cancel")) continue;
                                console.log("[AutoSubmit] Clicking overlay Submit:", text);
                                btn.click();
                                submitted = true;
                                break;
                            }
                        }
                        if (submitted) break;
                    }
                }
            }

            // Check if we landed on result page
            if (!submitted && (
                window.location.href.includes("analysis") ||
                window.location.href.includes("solutions") ||
                window.location.href.includes("result")
            )) {
                submitted = true;
            }
        }

        // Wait for result page
        await waitMs(5000);

        const result = submitted ? "ok" : "failed";
        console.log("[AutoSubmit] Result:", result, "for:", title);
        chrome.runtime.sendMessage({ type: "submitResult", result }).catch(() => { });
    }
})();
