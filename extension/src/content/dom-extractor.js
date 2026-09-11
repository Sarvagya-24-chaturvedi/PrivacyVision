export class DOMExtractor {
    static agentCounter = 1;
    static async extract(engine) {
        // 1. Run local privacy detection
        const detections = await engine.scanDocument();
        const sensitiveBoxMap = new Map();
        // Tag elements with agentId and collect interactive nodes
        const interactiveElements = Array.from(document.querySelectorAll("button, a[href], input, textarea, select, [role='button'], [role='link'], [role='textbox'], [contenteditable='true']"));
        const safeNodes = [];
        for (const el of interactiveElements) {
            const rect = el.getBoundingClientRect();
            // Skip invisible elements
            if (rect.width <= 0 || rect.height <= 0)
                continue;
            // Assign stable data-agent-id
            let agentId = el.getAttribute("data-agent-id");
            if (!agentId) {
                agentId = `el-${this.agentCounter++}`;
                el.setAttribute("data-agent-id", agentId);
            }
            // Check if this element matches any sensitive detection
            let matchedDetection;
            for (const det of detections) {
                const overlapX = Math.abs(rect.left - det.bbox.x) < 15;
                const overlapY = Math.abs(rect.top - det.bbox.y) < 15;
                if (overlapX && overlapY) {
                    matchedDetection = det;
                    break;
                }
            }
            const isSensitive = !!matchedDetection;
            const tag = el.tagName.toLowerCase();
            const type = (el.getAttribute("type") || "").toLowerCase();
            const role = el.getAttribute("role") || (tag === "button" ? "button" : tag === "input" ? "textbox" : tag);
            const isInput = tag === "input" || tag === "textarea";
            // Structural text: truncate and sanitize
            let text = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (text.length > 80)
                text = text.slice(0, 77) + "...";
            // Input value: strictly redacted if sensitive
            let val = undefined;
            let placeholder = undefined;
            if (isInput) {
                val = el.value;
                placeholder = el.getAttribute("placeholder") || undefined;
                if (isSensitive || type === "password") {
                    val = "[REDACTED]";
                    placeholder = "[REDACTED]";
                }
            }
            safeNodes.push({
                agentId,
                tag,
                role,
                type: type || undefined,
                label: el.getAttribute("aria-label") || undefined,
                placeholder,
                value: val,
                text: isSensitive && isInput ? "[REDACTED]" : text,
                bbox: {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                },
                sensitive: isSensitive,
                sensitiveType: matchedDetection?.type,
                confidence: matchedDetection?.confidence,
                interactable: !el.disabled,
                disabled: el.disabled
            });
        }
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
            scrollX: window.scrollX,
            scrollY: window.scrollY
        };
        const context = {
            url: window.location.href,
            title: document.title,
            viewport,
            nodes: safeNodes,
            sensitiveDetections: detections,
            timestamp: Date.now()
        };
        return { context, detections };
    }
}
