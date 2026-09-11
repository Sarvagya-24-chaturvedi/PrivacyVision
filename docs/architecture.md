# Architecture & Security Design — PrivacyVision (SIH26171)

## 1. Executive Summary

PrivacyVision implements an on-device privacy-preserving visual browser agent designed for Problem Statement **SIH26171** (*On-device Visual Perception for Light-weight Browser Agents*).

The core tenet is:
> **"See locally. Sanitize locally. Reason remotely. Act locally."**

Under conventional browser agent paradigms, raw screenshots containing passwords, emails, financial records, and faces are streamed unredacted to cloud multimodal language models (VLMs). PrivacyVision breaks this vulnerability by establishing a strict **On-Device Cryptographic & Privacy Boundary** inside the user's browser (Chrome Manifest V3).

---

## 2. Component Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        USER WEBPAGE                        │
└─────────────────────────────┬──────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
     ┌───────────────────┐         ┌───────────────────┐
     │ Content Script:   │         │ Background:       │
     │ DOM & A11y Tree   │         │ captureVisibleTab │
     └─────────┬─────────┘         └─────────┬─────────┘
               │                             │
    ┌──────────┴──────────┐       ┌──────────┴──────────┐
    ▼                     ▼       ▼                     ▼
┌───────────────┐  ┌─────────────┐┌──────────────┐┌────────────┐
│ DOM Detector: │  │ Semantic    ││ Local Vision ││ Local Face │
│ Input/ARIA/   │  │ Detector:   ││ ONNX/WebGPU/ ││ & OCR      │
│ Autocomplete  │  │ Labels/Forms││ WASM Fallback││ Detectors  │
└───────┬───────┘  └──────┬──────┘└──────┬───────┘└─────┬──────┘
        │                 │              │              │
        └─────────────────┼──────────────┼──────────────┘
                          ▼
            ┌───────────────────────────┐
            │ Multi-Signal Risk Scorer  │
            │ Normalized: 0.00 -> 1.00  │
            └─────────────┬─────────────┘
                          ▼
            ┌───────────────────────────┐
            │ Bounding Box Fusion Layer │
            │ IoU Overlap Deduplication │
            └─────────────┬─────────────┘
                          ▼
            ┌───────────────────────────┐
            │ Offscreen Canvas Redactor │
            │ Blackout / Mask / Blur    │
            └─────────────┬─────────────┘
                          ▼
            ┌───────────────────────────┐
            │     PRIVACY FIREWALL      │
            │ Outbound Leak Prevention  │
            └─────────────┬─────────────┘
                          │ (SANITIZED ONLY)
══════════════════════════╪═════════════════════════════════════
          NETWORK PRIVACY BOUNDARY (Original data NEVER leaves)
══════════════════════════╪═════════════════════════════════════
                          ▼
            ┌───────────────────────────┐
            │    FastAPI VLM Server     │
            │ Ollama / LLaVA / Qwen-VL  │
            └─────────────┬─────────────┘
                          ▼
            ┌───────────────────────────┐
            │   Constrained Action JSON │
            │   CLICK / SCROLL / TYPE   │
            └─────────────┬─────────────┘
                          ▼
            ┌───────────────────────────┐
            │   Local Action Validator  │
            │   Deterministic Execution │
            └───────────────────────────┘
```

---

## 3. Chrome Extension Manifest V3 Structure

1. **Content Script (`src/content/`)**:
   - Extracts semantic accessibility metadata.
   - Tags interactive elements with stable `data-agent-id="el-N"`.
   - Replaces sensitive DOM values with `[REDACTED]`.
   - Renders the real-time visual inspection overlay.

2. **Background Service Worker (`src/background/`)**:
   - Manages tab lifecycle and invokes `chrome.tabs.captureVisibleTab`.
   - Coordinates offscreen image redaction.
   - Houses the pre-flight **Privacy Firewall**.
   - Handles network transmission of sanitized payloads only.

3. **Offscreen Document (`src/offscreen/`)**:
   - Provides a dedicated 2D Canvas context in Manifest V3.
   - Scales CSS coordinates by devicePixelRatio (`DPR`).
   - Executes pixel redactions: Solid blackouts, mask tokens, and Gaussian blurs.

4. **Action System (`src/actions/`)**:
   - Rejects arbitrary JavaScript, `eval()`, and script injection vectors.
   - Enforces a strict whitelist: `CLICK`, `SCROLL`, `FOCUS`, `TYPE`, `SELECT`, `PRESS_KEY`, `WAIT`.
   - Validates target visibility, interactivity, and viewport bounds before execution.
