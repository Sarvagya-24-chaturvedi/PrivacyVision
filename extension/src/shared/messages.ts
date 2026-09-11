import { ExtractedDOMContext } from "./dom";
import { SensitiveDetection } from "./privacy";
import { AgentAction, ActionExecutionResult } from "./actions";
import { EvaluationMetrics, TimingBreakdown } from "./benchmark";

export type MessageType =
  | "EXTRACT_DOM"
  | "CAPTURE_CONTEXT"
  | "REDACT_IMAGE"
  | "SCAN_PRIVACY"
  | "RUN_AGENT"
  | "EXECUTE_ACTION"
  | "GET_STATUS"
  | "TOGGLE_OVERLAY"
  | "RUN_BENCHMARK";

export interface RedactImageRequest {
  type: "REDACT_IMAGE";
  dataUrl: string;
  boxes: SensitiveDetection[];
  dpr: number;
}

export interface RedactImageResponse {
  ok: boolean;
  sanitizedDataUrl?: string;
  error?: string;
  redactionCount: number;
  durationMs: number;
}

export interface ExtractDOMRequest {
  type: "EXTRACT_DOM";
}

export interface ExtractDOMResponse {
  ok: boolean;
  context?: ExtractedDOMContext;
  error?: string;
}

export interface CapturedContext {
  originalDataUrl: string;        // KEPT ON CLIENT ONLY - NEVER TRANSMITTED
  sanitizedDataUrl: string;       // SAFE TO TRANSMIT
  dom: ExtractedDOMContext;
  detections: SensitiveDetection[];
  timings: TimingBreakdown;
  firewallPassed: boolean;
  firewallReason?: string;
}

export interface CaptureContextRequest {
  type: "CAPTURE_CONTEXT";
}

export interface CaptureContextResponse {
  ok: boolean;
  context?: CapturedContext;
  error?: string;
}

export interface RunAgentRequest {
  type: "RUN_AGENT";
  task: string;
}

export interface RunAgentResponse {
  ok: boolean;
  action?: AgentAction;
  executionResult?: ActionExecutionResult;
  capturedContext?: CapturedContext;
  error?: string;
}

export interface ToggleOverlayRequest {
  type: "TOGGLE_OVERLAY";
  enabled?: boolean;
  detections?: SensitiveDetection[];
}

export interface SystemStatus {
  privacyEngineActive: boolean;
  serverConnected: boolean;
  serverUrl: string;
  inferenceBackend: "WebGPU" | "WASM" | "HEURISTIC";
  lastDetectionsCount: number;
  lastRedactionsCount: number;
  judgeMode: boolean;
}
