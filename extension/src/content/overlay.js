export class PrivacyOverlay {
    static overlayContainer = null;
    static show(detections) {
        this.hide();
        const container = document.createElement("div");
        container.id = "privacy-vision-overlay";
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100vw";
        container.style.height = "100vh";
        container.style.pointerEvents = "none";
        container.style.zIndex = "2147483647";
        container.style.fontFamily = "system-ui, -apple-system, sans-serif";
        // Header badge
        const header = document.createElement("div");
        header.style.position = "absolute";
        header.style.top = "12px";
        header.style.right = "12px";
        header.style.padding = "6px 14px";
        header.style.background = "rgba(15, 23, 42, 0.9)";
        header.style.color = "#38bdf8";
        header.style.borderRadius = "20px";
        header.style.border = "1px solid #0284c7";
        header.style.fontSize = "12px";
        header.style.fontWeight = "bold";
        header.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
        header.innerText = "🛡️ PrivacyVision Active ● Original data stays on device";
        container.appendChild(header);
        for (const det of detections) {
            const box = document.createElement("div");
            box.style.position = "absolute";
            box.style.left = `${det.bbox.x}px`;
            box.style.top = `${det.bbox.y}px`;
            box.style.width = `${det.bbox.width}px`;
            box.style.height = `${det.bbox.height}px`;
            box.style.borderRadius = "4px";
            box.style.pointerEvents = "none";
            const isPassword = det.type === "PASSWORD" || det.type === "PIN";
            const isFace = det.type === "FACE";
            const borderColor = isPassword ? "#ef4444" : isFace ? "#06b6d4" : "#eab308";
            const bgColor = isPassword
                ? "rgba(239, 68, 68, 0.15)"
                : isFace
                    ? "rgba(6, 182, 212, 0.15)"
                    : "rgba(234, 179, 8, 0.15)";
            box.style.border = `2px solid ${borderColor}`;
            box.style.background = bgColor;
            // Label badge
            const tag = document.createElement("div");
            tag.style.position = "absolute";
            tag.style.top = "-22px";
            tag.style.left = "0";
            tag.style.background = borderColor;
            tag.style.color = "#ffffff";
            tag.style.padding = "2px 6px";
            tag.style.borderRadius = "3px";
            tag.style.fontSize = "10px";
            tag.style.fontWeight = "bold";
            tag.style.whiteSpace = "nowrap";
            tag.innerText = `${det.type} — ${Math.round(det.confidence * 100)}%`;
            box.appendChild(tag);
            container.appendChild(box);
        }
        document.body.appendChild(container);
        this.overlayContainer = container;
    }
    static hide() {
        if (this.overlayContainer) {
            this.overlayContainer.remove();
            this.overlayContainer = null;
        }
        const existing = document.getElementById("privacy-vision-overlay");
        if (existing)
            existing.remove();
    }
    static isVisible() {
        return !!document.getElementById("privacy-vision-overlay");
    }
}
