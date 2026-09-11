/**
 * Frame Bridge — injected into all frames (including Google Form iframes)
 * Scans the inner DOM and reports detections back to the parent extension
 */
import { UnifiedPrivacyEngine } from "../privacy/detector";
import { PrivacyPolicyManager } from "../privacy/privacy-policy";
const isTopFrame = window === window.top;
async function runFrameScan() {
    if (isTopFrame)
        return; // Content script handles top frame
    const engine = new UnifiedPrivacyEngine(new PrivacyPolicyManager());
    const detections = await engine.scanDocument();
    if (detections.length > 0) {
        chrome.runtime.sendMessage({
            type: 'FRAME_SCAN_RESULT',
            payload: {
                frameUrl: window.location.href,
                frameOrigin: window.location.origin,
                detections
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', runFrameScan);
setTimeout(runFrameScan, 1000); // Re-run for lazy-loaded forms
