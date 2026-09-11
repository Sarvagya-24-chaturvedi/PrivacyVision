export type SensitiveDataType =
  // Credentials
  | "PASSWORD"
  | "OTP"
  | "PIN"
  | "API_KEY"
  | "SECRET"
  | "ACCESS_TOKEN"
  | "BEARER_TOKEN"
  // Personal Info
  | "EMAIL"
  | "PHONE"
  | "ADDRESS"
  | "DOB"
  | "NAME"
  // Indian Identifiers
  | "AADHAAR"
  | "PAN"
  | "IFSC"
  | "BANK_ACCOUNT"
  // Payment
  | "CREDIT_CARD"
  | "CVV"
  | "UPI_ID"
  | "REGISTRATION_NUMBER"
  | "USN"
  | "IDENTIFICATION_NUMBER"
  // Visual
  | "FACE"
  | "OCR_TEXT";

export type RedactionAction = "BLACKOUT" | "MASK" | "BLUR";

export type DetectionSource =
  | "DOM"
  | "SEMANTIC"
  | "REGEX"
  | "OCR"
  | "FACE"
  | "VISION_MODEL"
  | "AUTOCOMPLETE";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SensitiveDetection {
  id: string;
  type: SensitiveDataType;
  confidence: number;
  sources: DetectionSource[];
  bbox: BoundingBox;
  action: RedactionAction;
  agentId?: string;
  label?: string;
  placeholderRedaction?: string;
}

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export interface PrivacyPolicy {
  highThreshold: number;   // default 0.85
  mediumThreshold: number; // default 0.60
  defensiveMode: boolean;  // default true: prefer privacy on uncertainty
  allowBlurForFaces: boolean;
  maskString: string;      // default "[REDACTED]"
}

export const DEFAULT_PRIVACY_POLICY: PrivacyPolicy = {
  highThreshold: 0.85,
  mediumThreshold: 0.60,
  defensiveMode: true,
  allowBlurForFaces: true,
  maskString: "[REDACTED]"
};
