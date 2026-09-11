export async function detectFacesOnCanvas(canvas, origWidth, origHeight) {
    const FaceDetector = globalThis.FaceDetector;
    if (!FaceDetector)
        return [];
    try {
        const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 12 });
        const faces = await detector.detect(canvas);
        const scaleX = origWidth / canvas.width;
        const scaleY = origHeight / canvas.height;
        return faces.map(({ boundingBox }) => ({
            x: Math.round(boundingBox.x * scaleX),
            y: Math.round(boundingBox.y * scaleY),
            width: Math.round(boundingBox.width * scaleX),
            height: Math.round(boundingBox.height * scaleY),
            confidence: 0.96
        })).filter((box) => box.width > 10 && box.height > 10);
    }
    catch {
        return [];
    }
}
