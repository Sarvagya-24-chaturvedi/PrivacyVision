import { BoundingBox, SensitiveDataType, SensitiveDetection } from "./privacy";

export interface PrivacySafeDOMNode {
  agentId: string;
  tag: string;
  role: string;
  type?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  text?: string;
  bbox: BoundingBox;
  sensitive: boolean;
  sensitiveType?: SensitiveDataType;
  confidence?: number;
  interactable: boolean;
  disabled?: boolean;
}

export interface ViewportInfo {
  width: number;
  height: number;
  dpr: number;
  scrollX: number;
  scrollY: number;
}

export interface ExtractedDOMContext {
  url: string;
  title: string;
  viewport: ViewportInfo;
  nodes: PrivacySafeDOMNode[];
  sensitiveDetections: SensitiveDetection[];
  timestamp: number;
}
