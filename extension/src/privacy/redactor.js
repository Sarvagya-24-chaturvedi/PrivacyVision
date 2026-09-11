export class ImageRedactor {
    /**
     * Applies redaction operations to an HTMLCanvasElement context.
     */
    static redactCanvas(ctx, canvasWidth, canvasHeight, detections, dpr = 1) {
        let appliedCount = 0;
        for (const det of detections) {
            // Scale CSS pixels to physical canvas device pixels
            const x = Math.max(0, Math.round(det.bbox.x * dpr));
            const y = Math.max(0, Math.round(det.bbox.y * dpr));
            const w = Math.min(canvasWidth - x, Math.round(det.bbox.width * dpr));
            const h = Math.min(canvasHeight - y, Math.round(det.bbox.height * dpr));
            if (w <= 0 || h <= 0)
                continue;
            switch (det.action) {
                case "BLACKOUT": {
                    ctx.save();
                    ctx.fillStyle = "#0a0a0a";
                    ctx.fillRect(x, y, w, h);
                    // Subtle security border & label
                    ctx.strokeStyle = "#3b82f6";
                    ctx.lineWidth = Math.max(1, Math.round(2 * dpr));
                    ctx.strokeRect(x, y, w, h);
                    // Draw small tag if height permits
                    if (h > 18 * dpr && w > 60 * dpr) {
                        ctx.fillStyle = "#ef4444";
                        ctx.font = `bold ${Math.max(10, Math.round(11 * dpr))}px sans-serif`;
                        ctx.fillText("● PROTECTED", x + 4 * dpr, y + Math.min(h - 4 * dpr, 14 * dpr));
                    }
                    ctx.restore();
                    appliedCount++;
                    break;
                }
                case "BLUR": {
                    ctx.save();
                    try {
                        // Use canvas blur filter if available, or pixelate fallback
                        const tempCanvas = document.createElement("canvas");
                        tempCanvas.width = w;
                        tempCanvas.height = h;
                        const tempCtx = tempCanvas.getContext("2d");
                        if (tempCtx) {
                            tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
                            ctx.save();
                            ctx.filter = `blur(${Math.round(14 * dpr)}px)`;
                            ctx.drawImage(tempCanvas, x, y);
                            ctx.restore();
                        }
                        else {
                            // Fallback pixelation
                            ctx.fillStyle = "#1e293b";
                            ctx.fillRect(x, y, w, h);
                        }
                    }
                    catch {
                        ctx.fillStyle = "#1e293b";
                        ctx.fillRect(x, y, w, h);
                    }
                    // Subtle cyan border for face protection
                    ctx.strokeStyle = "#06b6d4";
                    ctx.lineWidth = Math.max(1, Math.round(2 * dpr));
                    ctx.strokeRect(x, y, w, h);
                    ctx.restore();
                    appliedCount++;
                    break;
                }
                case "MASK":
                default: {
                    ctx.save();
                    ctx.fillStyle = "#1e293b"; // Dark theme mask
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeStyle = "#64748b";
                    ctx.lineWidth = Math.max(1, Math.round(1 * dpr));
                    ctx.strokeRect(x, y, w, h);
                    // Centered REDACTED placeholder text
                    const fontSize = Math.max(9, Math.min(Math.round(h * 0.55), Math.round(13 * dpr)));
                    ctx.font = `bold ${fontSize}px monospace`;
                    ctx.fillStyle = "#94a3b8";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    const label = det.label || `[${det.type}_REDACTED]`;
                    ctx.fillText(label, x + w / 2, y + h / 2, w - 8 * dpr);
                    ctx.restore();
                    appliedCount++;
                    break;
                }
            }
        }
        return appliedCount;
    }
}
