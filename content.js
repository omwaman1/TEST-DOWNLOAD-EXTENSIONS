// Content script — runs on testbook.com pages
// Finds and clicks Submit button, then confirms the popup

(function () {
    function notifyReady() {
        chrome.runtime.sendMessage({ type: "pageReady" }).catch(() => { });
    }

    if (document.readyState === "complete") {
        setTimeout(notifyReady, 2000);
    } else {
        window.addEventListener("load", () => setTimeout(notifyReady, 2000));
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "autoSubmit") {
            autoSubmit(msg.testId, msg.title);
        }
    });

    function waitMs(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // Find a button by its visible text
    function findButtonByText(searchText, container = document) {
        const allClickable = container.querySelectorAll("button, a, div[role='button'], span[role='button']");
        for (const el of allClickable) {
            const text = el.textContent.trim().toLowerCase();
            if (text === searchText.toLowerCase() || text.includes(searchText.toLowerCase())) {
                // Make sure it's not the "Close" or "Cancel" button
                if (text.includes("close") || text.includes("cancel")) continue;
                return el;
            }
        }
        return null;
    }

    async function autoSubmit(testId, title) {
        console.log("[AutoSubmit] Starting for:", title);
        await waitMs(3000); // Wait for test page to fully render

        let submitted = false;

        for (let attempt = 0; attempt < 15 && !submitted; attempt++) {
            await waitMs(1500);

            // STEP 1: Find and click the main "Submit Test" button
            const submitBtn = findButtonByText("Submit Test") || findButtonByText("submit");
            if (submitBtn) {
                console.log("[AutoSubmit] Clicking main Submit button");
                submitBtn.click();
                await waitMs(2000);

                // STEP 2: Handle the confirmation popup
                // The popup shows "Submit your test" with Close and Submit buttons
                for (let popupAttempt = 0; popupAttempt < 8; popupAttempt++) {
                    await waitMs(1000);

                    // Look for the popup Submit button (distinct from the main one)
                    // The popup has a table with section info and two buttons: Close, Submit
                    const allButtons = document.querySelectorAll("button");
                    for (const btn of allButtons) {
                        const text = btn.textContent.trim().toLowerCase();
                        // Find "Submit" button that is NOT "Submit Test" (the popup button is just "Submit")
                        if (text === "submit") {
                            console.log("[AutoSubmit] Clicking popup Submit button");
                            btn.click();
                            submitted = true;
                            break;
                        }
                    }
                    if (submitted) break;

                    // Also try looking inside modals/overlays
                    const overlays = document.querySelectorAll("[class*='modal'], [class*='dialog'], [class*='popup'], [class*='overlay'], [class*='Modal'], [class*='Dialog']");
                    for (const overlay of overlays) {
                        const btns = overlay.querySelectorAll("button");
                        for (const btn of btns) {
                            const text = btn.textContent.trim().toLowerCase();
                            if (text === "submit" || text.includes("submit")) {
                                if (text.includes("close") || text.includes("cancel")) continue;
                                console.log("[AutoSubmit] Clicking overlay Submit button:", text);
                                btn.click();
                                submitted = true;
                                break;
                            }
                        }
                        if (submitted) break;
                    }
                }
            }

            // Check if we're already on the result page (maybe auto-submitted)
            if (!submitted && (
                window.location.href.includes("analysis") ||
                window.location.href.includes("solutions") ||
                window.location.href.includes("result")
            )) {
                submitted = true;
            }
        }

        // Wait for result page to load
        await waitMs(3000);

        const result = submitted ? "ok" : "failed";
        console.log("[AutoSubmit] Result:", result, "for:", title);
        chrome.runtime.sendMessage({ type: "submitResult", result }).catch(() => { });
    }
})();
