import { GroundTruthItem } from "../shared/benchmark";

export const DEMO_GROUND_TRUTH: Record<string, GroundTruthItem[]> = {
  login: [
    {
      id: "gt_email",
      type: "EMAIL",
      bbox: { x: 100, y: 150, width: 320, height: 40 },
      textSnippet: "john@example.com"
    },
    {
      id: "gt_password",
      type: "PASSWORD",
      bbox: { x: 100, y: 220, width: 320, height: 40 },
      textSnippet: "secretPassword123"
    }
  ],
  payment: [
    {
      id: "gt_card",
      type: "CREDIT_CARD",
      bbox: { x: 100, y: 140, width: 320, height: 40 },
      textSnippet: "4111 1111 1111 1111"
    },
    {
      id: "gt_cvv",
      type: "CVV",
      bbox: { x: 280, y: 200, width: 140, height: 40 },
      textSnippet: "123"
    }
  ],
  pii: [
    {
      id: "gt_aadhaar",
      type: "AADHAAR",
      bbox: { x: 100, y: 120, width: 320, height: 40 },
      textSnippet: "2345 6789 0123"
    },
    {
      id: "gt_pan",
      type: "PAN",
      bbox: { x: 100, y: 180, width: 320, height: 40 },
      textSnippet: "ABCDE1234F"
    },
    {
      id: "gt_phone",
      type: "PHONE",
      bbox: { x: 100, y: 240, width: 320, height: 40 },
      textSnippet: "+91 9876543210"
    }
  ],
  ocr: [
    {
      id: "gt_ocr_email",
      type: "EMAIL",
      bbox: { x: 120, y: 160, width: 300, height: 60 },
      textSnippet: "support@securebank.in"
    }
  ],
  face: [
    {
      id: "gt_face",
      type: "FACE",
      bbox: { x: 200, y: 100, width: 120, height: 120 }
    }
  ]
};
