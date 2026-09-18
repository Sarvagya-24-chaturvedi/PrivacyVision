import { DOMExtractor } from "./dom-extractor";
import { UnifiedPrivacyEngine } from "../privacy/detector";
import { PrivacyOverlay } from "./overlay";
import { ActionValidator } from "../actions/action-validator";
import { ActionExecutor } from "../actions/action-executor";
import { startMutationWatch } from "./mutation-watcher";
import { PrivacyPolicyManager } from "../privacy/privacy-policy";
const privacyEngine = new UnifiedPrivacyEngine();
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object")
        return;
    if (message.type === "EXTRACT_DOM") {
        (async () => {
            try {
                const { context, detections } = await DOMExtractor.extract(privacyEngine);
                sendResponse({ ok: true, context, detections });
            }
            catch (err) {
                sendResponse({ ok: false, error: err.message || "Failed to extract DOM" });
            }
        })();
        return true; // Keep channel open for async response
    }
    if (message.type === "TOGGLE_OVERLAY") {
        if (message.enabled === false) {
            PrivacyOverlay.hide();
            sendResponse({ ok: true, visible: false });
        }
        else if (message.enabled === true && message.detections) {
            PrivacyOverlay.show(message.detections);
            sendResponse({ ok: true, visible: true });
        }
        else {
            // Toggle
            if (PrivacyOverlay.isVisible()) {
                PrivacyOverlay.hide();
                sendResponse({ ok: true, visible: false });
            }
            else {
                (async () => {
                    const detections = await privacyEngine.scanDocument();
                    PrivacyOverlay.show(detections);
                    sendResponse({ ok: true, visible: true, count: detections.length });
                })();
                return true;
            }
        }
        return;
    }
    if (message.type === "EXECUTE_ACTION") {
        (async () => {
            try {
                const validation = ActionValidator.validate(message.action);
                if (!validation.valid) {
                    sendResponse({
                        ok: false,
                        error: `Action validation failed: ${validation.reason}`,
                        validation
                    });
                    return;
                }
                const executionResult = await ActionExecutor.execute(message.action);
                sendResponse({ ok: executionResult.success, executionResult });
            }
            catch (err) {
                sendResponse({ ok: false, error: err.message || "Failed to execute action" });
            }
        })();
        return true;
    }
    if (message.type === "FRAME_SCAN_RESULT") {
        const existing = window.__privacyVisionFrameDetections || [];
        window.__privacyVisionFrameDetections = [...existing, ...(message.payload?.detections || [])];
        sendResponse({ ok: true });
        return;
    }
});
// Start MutationObserver for SPA re-scan
const _mutationEngine = new UnifiedPrivacyEngine(new PrivacyPolicyManager());
startMutationWatch(_mutationEngine, (newDetections) => {
    // Cache latest detections for next popup capture
    window.__privacyVisionLastDetections = newDetections;
});
