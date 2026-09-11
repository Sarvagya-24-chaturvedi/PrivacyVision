/**
 * Content scripts must remain classic scripts in Chrome. Keeping ONNX Runtime
 * here makes its `import.meta` worker bootstrap prevent page scanning entirely.
 * Prefer the browser's local FaceDetector API; face-detector.ts also retains a
 * semantic fallback for protected or cross-origin image pixels.
 */
export interface FaceBBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface NativeFace {
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface NativeFaceDetector {
  detect(source: ImageBitmapSource): Promise<NativeFace[]>;
}

interface NativeFaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): NativeFaceDetector;
}

export async function detectFacesOnCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  origWidth: number,
  origHeight: number
): Promise<FaceBBox[]> {
  const FaceDetector = (globalThis as unknown as { FaceDetector?: NativeFaceDetectorConstructor }).FaceDetector;
  if (!FaceDetector) return [];

  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 12 });
    const faces = await detector.detect(canvas as unknown as ImageBitmapSource);
    const scaleX = origWidth / canvas.width;
    const scaleY = origHeight / canvas.height;
    return faces.map(({ boundingBox }) => ({
      x: Math.round(boundingBox.x * scaleX),
      y: Math.round(boundingBox.y * scaleY),
      width: Math.round(boundingBox.width * scaleX),
      height: Math.round(boundingBox.height * scaleY),
      confidence: 0.96
    })).filter((box) => box.width > 10 && box.height > 10);
  } catch {
    return [];
  }
}
