import { BoundingBox, SensitiveDataType } from "./privacy";

export interface TimingBreakdown {
  captureMs: number;
  domMs: number;
  privacyMs: number;
  ocrMs: number;
  redactionMs: number;
  networkMs: number;
  vlmMs: number;
  actionMs: number;
  totalMs: number;
}

export interface GroundTruthItem {
  id: string;
  type: SensitiveDataType;
  bbox: BoundingBox;
  textSnippet?: string;
}

export interface EvaluationMetrics {
  visualAccuracyScore: number;     // 0-100% (25% weight)
  precision: number;               // 0.0 - 1.0 (20% weight)
  recall: number;                  // 0.0 - 1.0
  f1Score: number;
  averageIoU: number;              // 0.0 - 1.0 (20% weight)
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  memoryUsageMb?: number;          // (20% weight)
  inferenceBackend: "WebGPU" | "WASM" | "HEURISTIC";
  timings: TimingBreakdown;        // Latency (15% weight)
  timestamp: number;
}
