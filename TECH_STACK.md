# PrivacyVision — Technology Stack

## Product overview

PrivacyVision is a Chrome Manifest V3 browser extension and local FastAPI service for on-device visual perception and lightweight browser agents. It detects sensitive values and faces on the device, sanitizes the screenshot and structural browser context, verifies the outbound payload, and only then allows an agent to reason about the page.

## Extension client

| Area | Technology | Responsibility |
| --- | --- | --- |
| Browser platform | Chrome Extension Manifest V3 | Service-worker lifecycle, tab capture, permissions, content-script injection, and offscreen documents. |
| Language | TypeScript (strict mode) | Type-safe privacy data structures, message contracts, action validation, and UI logic. |
| Bundler | Vite + Rollup | Production build for popup, background worker, offscreen document, and a separately bundled classic content script. |
| Page inspection | DOM, ARIA, `MutationObserver`, Shadow DOM traversal | Finds fields and rendered sensitive text across standard sites, SPAs, and Google Forms-style accessible controls. |
| Privacy detection | Regex, semantic labels, DOM metadata, Luhn and Verhoeff validation | Protects passwords, PIN/OTP, account/card/IFSC/UPI data, Aadhaar, PAN, phone/email, registration numbers, USNs, and labelled IDs. |
| Face privacy | Browser-local `FaceDetector` when exposed by Chrome, semantic and photo-safe fallback | Locally identifies face regions; a conservative fallback blurs an unlabelled ordinary photo rather than exposing a face. |
| Image processing | Canvas API in an offscreen document | Applies blackout, masking, and Gaussian-style blur to pixels before any request leaves the browser. |
| Privacy firewall | Local TypeScript outbound payload audit | Fails closed when raw sensitive patterns remain in DOM metadata or an invalid screenshot payload is detected. |
| Agent safety | JSON schema + local action executor | Allows only constrained actions (`CLICK`, `SCROLL`, `FOCUS`, `TYPE`, `SELECT`, `PRESS_KEY`, `WAIT`); rejects arbitrary JavaScript. |
| Testing | Vitest | Unit tests for privacy patterns, payload firewall, action validation, and bounding-box fusion. |

## Reasoning service

| Area | Technology | Responsibility |
| --- | --- | --- |
| API framework | FastAPI + Pydantic | Typed endpoints for health checks, agent reasoning, classification, and analysis. |
| Web server | Uvicorn | Local ASGI server for the privacy-aware agent service and demo hub. |
| VLM coordination | Ollama-compatible service with deterministic fallback | Reasons only on the sanitized screenshot and privacy-safe DOM context. |
| Model runtime | ONNX Runtime (optional) + NumPy + Pillow | Loads the exported MobileViT browser-scene classifier when a trained model is installed. |
| Security | Server-side payload auditor + CORS | Independently rejects unredacted high-risk payloads and supports the extension origin. |
| Tests | Pytest + FastAPI TestClient | Covers health, security and agent endpoints. |

## Model training and deployment

The optional page-classifier pipeline uses PyTorch, TorchVision, Hugging Face Transformers and MobileViT Small. It generates a six-class synthetic browser dataset (`login`, `payment`, `form`, `pii`, `dashboard`, `modal`), fine-tunes MobileViT, evaluates it, and exports ONNX for use by the backend. The agent service is deliberately designed to remain usable in a safe heuristic mode until the trained ONNX file is deployed.

## Privacy boundary

1. The extension extracts page structure and captures the visible tab locally.
2. Detection results are fused with IoU bounding-box merging.
3. The offscreen canvas physically removes sensitive pixels; the original image is retained only locally.
4. A pre-flight firewall validates the sanitized screenshot and metadata.
5. Only sanitized context reaches the local/remote reasoning service.
6. Returned actions pass local schema validation before deterministic browser execution.
