import { detectFacesOnCanvas } from "../vision/blazeface-runner";
export class FaceDetector {
    static async detectFacesInDocument() {
        const detections = [];
        const images = Array.from(document.querySelectorAll("img, [role='img'], canvas, svg[data-face], video"));
        for (let i = 0; i < images.length; i++) {
            const el = images[i];
            const rect = el.getBoundingClientRect();
            if (rect.width < 20 || rect.height < 20)
                continue;
            if (rect.top > window.innerHeight * 3)
                continue;
            const alt = (el.getAttribute("alt") || "").toLowerCase();
            const src = (el.getAttribute("src") || "").toLowerCase();
            const id = (el.id || "").toLowerCase();
            const className = (typeof el.className === "string" ? el.className : "").toLowerCase();
            const descriptor = `${alt} ${src} ${id} ${className}`;
            // Quick semantic check first - avoid expensive inference on unlikely elements
            const isLikelyCandidateSemantically = /face|avatar|profile|user.?photo|headshot|portrait|team.?member|author|photo|person|selfie|pic/i.test(descriptor) ||
                el.hasAttribute("data-face") ||
                el.getAttribute("data-type") === "face" ||
                el.tagName === "VIDEO";
            // Privacy-first fallback for ordinary photos without descriptive metadata.
            // Native local face detection is attempted first; otherwise blur the
            // complete photo rather than transmit a potentially visible face.
            const isLikelyUnlabelledPhoto = el.tagName === "IMG" &&
                el.naturalWidth >= 96 &&
                el.naturalHeight >= 96 &&
                !/logo|icon|sprite|favicon|illustration|diagram|banner/i.test(descriptor);
            // For <img> elements, also try pixel-level detection via ONNX
            let faceBoxes = [];
            if (el.tagName === "IMG" || el.tagName === "CANVAS") {
                try {
                    const offCanvas = new OffscreenCanvas(Math.min(rect.width, 512), Math.min(rect.height, 512));
                    const ctx = offCanvas.getContext("2d");
                    ctx.drawImage(el, 0, 0, offCanvas.width, offCanvas.height);
                    const detected = await detectFacesOnCanvas(offCanvas, rect.width, rect.height);
                    faceBoxes = detected;
                }
                catch {
                    // Cross-origin images will throw — fall back to semantic
                }
            }
            if (faceBoxes.length > 0) {
                // Use real ONNX bounding boxes
                for (let fi = 0; fi < faceBoxes.length; fi++) {
                    const fb = faceBoxes[fi];
                    const bbox = {
                        x: Math.round(rect.left + fb.x),
                        y: Math.round(rect.top + fb.y),
                        width: fb.width,
                        height: fb.height
                    };
                    detections.push({
                        id: `face_${i + 1}_${fi + 1}`,
                        type: "FACE",
                        confidence: fb.confidence,
                        sources: ["FACE", "VISION_MODEL"],
                        bbox,
                        action: "BLUR",
                        label: "[FACE_REDACTED]"
                    });
                }
            }
            else if (isLikelyCandidateSemantically || isLikelyUnlabelledPhoto) {
                // Semantic fallback for cross-origin images where pixel access fails
                const bbox = {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                };
                detections.push({
                    id: `face_${i + 1}`,
                    type: "FACE",
                    confidence: 0.82,
                    sources: ["FACE"],
                    bbox,
                    action: "BLUR",
                    label: "[FACE_REDACTED]"
                });
            }
        }
        return detections;
    }
}
