export interface ModelInfo {
  name: string;
  version: string;
  backend: "WebGPU" | "WASM" | "HEURISTIC";
  memoryMb?: number;
}

export interface VisionDetection {
  label: string;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface VisionModel {
  initialize(): Promise<void>;
  detect(image: ImageData | HTMLCanvasElement): Promise<VisionDetection[]>;
  getModelInfo(): ModelInfo;
  getBackend(): "WebGPU" | "WASM" | "HEURISTIC";
  dispose(): Promise<void>;
}
