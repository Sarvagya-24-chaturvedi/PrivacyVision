import { ImageRedactor } from "../privacy/redactor";
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "REDACT_IMAGE")
        return;
    (async () => {
        const startTime = performance.now();
        try {
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e) => reject(new Error("Failed to decode screenshot image buffer"));
                img.src = message.dataUrl;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: false });
            if (!ctx) {
                throw new Error("Could not acquire 2D canvas context in offscreen document");
            }
            // Draw original screenshot onto offscreen canvas
            ctx.drawImage(img, 0, 0);
            // Perform physical on-device pixel redactions
            const dpr = Number(message.dpr) || 1;
            const redactionCount = ImageRedactor.redactCanvas(ctx, canvas.width, canvas.height, message.boxes || [], dpr);
            // Export sanitized PNG data URL
            const sanitizedDataUrl = canvas.toDataURL("image/png");
            const durationMs = Math.round(performance.now() - startTime);
            const response = {
                ok: true,
                sanitizedDataUrl,
                redactionCount,
                durationMs
            };
            sendResponse(response);
        }
        catch (err) {
            sendResponse({
                ok: false,
                error: err.message || "Failed to redact image in offscreen document",
                redactionCount: 0,
                durationMs: Math.round(performance.now() - startTime)
            });
        }
    })();
    return true; // Keep channel open for async response
});
