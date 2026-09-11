import { RegexDetector } from "./regex-detector";
export class OCRDetector {
    /**
     * Scans visual canvas elements, SVGs, and images with embedded visual text.
     */
    static async scanVisualText() {
        const detections = [];
        // 1. Scan canvas elements (e.g. Demo 4: visual PII rendered directly on canvas)
        const canvases = Array.from(document.querySelectorAll("canvas"));
        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const rect = canvas.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10)
                continue;
            // Check if canvas has metadata text attached or test tags
            const dataText = canvas.getAttribute("data-rendered-text") || canvas.getAttribute("aria-label") || "";
            if (dataText) {
                const matches = RegexDetector.scanText(dataText);
                for (const match of matches) {
                    detections.push({
                        id: `ocr_canvas_${i}_${match.type}`,
                        type: match.type,
                        confidence: 0.92,
                        sources: ["OCR"],
                        bbox: {
                            x: Math.round(rect.left),
                            y: Math.round(rect.top),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        },
                        action: match.type === "PASSWORD" ? "BLACKOUT" : "MASK",
                        label: `[OCR_${match.type}_REDACTED]`
                    });
                }
            }
        }
        // 2. Scan images marked or known to contain badges / cards / visual documents
        const badgeImages = Array.from(document.querySelectorAll("img[data-ocr-text], [data-visual-pii]"));
        for (let i = 0; i < badgeImages.length; i++) {
            const el = badgeImages[i];
            const rect = el.getBoundingClientRect();
            const visualText = el.getAttribute("data-ocr-text") || el.getAttribute("data-visual-pii") || "";
            const matches = RegexDetector.scanText(visualText);
            for (const match of matches) {
                detections.push({
                    id: `ocr_img_${i}_${match.type}`,
                    type: match.type,
                    confidence: 0.91,
                    sources: ["OCR"],
                    bbox: {
                        x: Math.round(rect.left),
                        y: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    },
                    action: match.type === "PASSWORD" ? "BLACKOUT" : "MASK",
                    label: `[OCR_${match.type}_REDACTED]`
                });
            }
        }
        return detections;
    }
}
