# PrivacyVision: On-Device Visual Perception and Zero-Knowledge Air-Gapped Redaction for Autonomous Browser Agents

**Enterprise AI Security & Privacy-Preserving Web Automation Standard**

*Authors & Engineering Team: Sarvagya Chaturvedi & The PrivacyVision Team*  
*Repository: https://github.com/Sarvagya-24-chaturvedi/PrivacyVision.git*  
*Date: September 2026*  
*Document Version: 3.0.0 (Enterprise Specification & Project Documentation)*

---

## Abstract

Autonomous Vision-Language Model (VLM) browser agents represent a transformative paradigm in web automation, enabling AI assistants to interpret graphical user interfaces (GUIs), navigate web workflows, and execute complex multi-step tasks. However, existing browser agent architectures suffer from a critical, systemic security vulnerability: they transmit raw viewport screenshots and full Document Object Model (DOM) hierarchies to remote cloud servers. This exposes sensitive credentials, financial records, statutory identifiers (Aadhaar, PAN, UPI, IFSC), and biometric human faces to untrusted third-party infrastructure.

This paper introduces **PrivacyVision**, an on-device visual perception engine and client-side privacy firewall implemented as a Chrome Manifest V3 extension. PrivacyVision operates on an *air-gapped, zero-knowledge perception principle*: all multi-signal PII detection, pixel-level face localization, and canvas redactions occur strictly on the user's local hardware using WebGPU/WASM-accelerated ONNX Runtime and offscreen canvas manipulation before any network byte is emitted. 

We evaluate PrivacyVision across 1,200 curated and augmented web page scenarios and real-world institutional web portals (including educational portals, banking services, and statutory KYC forms). Our multi-signal detection engine achieves a **96.5% visual context accuracy**, **0.98 detection precision**, **0.95 recall (0.965 F1-score)**, and **0.88 mean Intersection-over-Union (IoU)**, with an average on-device redaction latency of **64 ms** and **zero data leakage** validated by an automated fail-closed firewall.

---

## 1. The Autonomous Browser Agent Privacy Dilemma

### 1.1 Background
The emergence of frontier Vision-Language Models (e.g., GPT-4V, LLaVA, Claude 3.5 Sonnet, Gemini 1.5 Pro) has catalyzed the development of autonomous browser agents capable of seeing web pages like humans. Instead of fragile, hand-engineered CSS/XPath selectors, these agents ingest full page screenshots, plan actions through visual grounding, and execute UI events (clicks, typing, navigation).

### 1.2 The Security & Privacy Vulnerability
Despite their capabilities, contemporary agent frameworks (including Mind2Web, WebArena, SeeAct, and commercial autonomous extensions) suffer from profound privacy shortcomings:
1. **Unconstrained Visual Exfiltration:** High-resolution screenshots contain rendered passwords, two-factor authentication (2FA) SMS codes, credit card CVVs, account balances, biometric profile headshots, and personal identity documents.
2. **DOM-Level Credential Exposure:** Inspecting the DOM tree exposes plaintext values from input fields, hidden form tokens, and session metadata.
3. **Indirect Prompt Injection:** Adversarial websites can embed hidden text instructions (e.g., white-on-white text) that hijack the cloud VLM's behavior to harvest user data.
4. **Regulatory Non-Compliance:** Transmitting raw PII to remote inference servers violates global and national privacy regulations, including the European General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and India's Digital Personal Data Protection Act (DPDPA 2023).

### 1.3 The PrivacyVision Solution
PrivacyVision designs, implements, and deploys an **on-device visual perception layer for lightweight browser agents** that guarantees:
- **Zero Raw Visual Leakage:** Raw screenshots never leave the client device under any circumstances.
- **Physical Pixel Redaction:** Redaction is destructive on canvas memory, not cosmetic CSS hiding.
- **Multi-Signal Detection:** High-speed combination of DOM attributes, semantic label clustering, checksum-verified regex, on-device neural face detection, and visual OCR.
- **Fail-Closed Privacy Firewall:** An automated outbound inspector that intercepts and kills any payload containing leaked PII before network transmission.
- **Universal Page Support:** Seamless operation across standard HTML, Google Forms, Google Docs, PDFs, SPAs, and canvas-rendered web apps.

---

## 2. Literature Review & Comparative Analysis

### 2.1 State-of-the-Art Literature Review

1. **Mind2Web (Deng et al., 2023):**  
   Mind2Web proposed a generalist agent benchmark for the web, focusing on multi-step reasoning over raw DOM trees. While effective for benchmark testing, Mind2Web explicitly transfers the entire sanitized DOM hierarchy to LLMs, lacking support for visual-only PII (such as canvas elements, images, or rendered identity cards) and offering no protection against credential exfiltration.

2. **WebArena (Zhou et al., 2023) & VisualWebArena (Koh et al., 2024):**  
   WebArena established an end-to-end web environment for autonomous agents. VisualWebArena extended this to visual agents by supplying raw full-page screenshots to VLMs. In both benchmarks, privacy is out of scope: agents capture and transmit raw authentication tokens, billing information, and user avatars directly to cloud APIs.

3. **SeeAct (Zheng et al., 2024):**  
   SeeAct investigated visual grounding for web automation using GPT-4V. The architecture takes raw page screenshots, overlays numeric visual tags (set-of-marks), and prompts the model to choose actions. Because the model requires the raw visual image to ground buttons and inputs, privacy is completely compromised if applied to authenticated user sessions.

4. **Enterprise Data Loss Prevention (DLP) Gateways (Symantec, Zscaler):**  
   Traditional network DLP solutions operate at proxy level (HTTP/TLS inspection). However, modern web applications employ client-side rendering (Single Page Applications, WebSockets, Canvas2D) and encrypted payloads that bypass or blind network-level proxies. Moreover, network DLPs cannot alter pixel data within rendered browser canvas buffers.

5. **Client-Side Content Blockers (uBlock Origin, Privacy Badger):**  
   Extensions like uBlock Origin focus on blocking third-party tracking scripts and ad networks by intercepting network requests via `declarativeNetRequest`. They do not analyze rendered visual frames, do not understand UI semantics, and cannot enable autonomous agent navigation.

### 2.2 Comparative Analysis Table

| Feature / Dimension | Raw VLM Browser Extensions | Mind2Web / WebArena Agents | Enterprise Network DLP | Client Ad-Blockers (uBlock) | **PrivacyVision (This Project)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Execution Environment** | Remote Cloud | Remote Server / Container | Network Proxy Appliance | In-Browser Extension | **In-Browser (Chrome MV3 + Local Daemon)** |
| **Visual Screenshot Handling** | Sent RAW to Cloud VLM | Sent RAW to Cloud VLM | Ignored (Cannot parse visual pixels) | Ignored (No visual pipeline) | **100% Sanitized on Offscreen Canvas** |
| **Biometric Face Redaction** | ❌ None | ❌ None | ❌ None | ❌ None | **✅ BlazeFace Neural Model (On-Device)** |
| **Indian Statutory IDs (KYC)** | ❌ Generic / None | ❌ None | ⚠️ Basic Regex Only | ❌ None | **✅ Aadhaar (Verhoeff), PAN, UPI, IFSC** |
| **Detection Methodology** | None (Raw dump) | Text DOM parsing only | Pattern matching on HTTP body | URL rule lists / EasyList | **Multi-Signal (DOM + Semantic + Regex + ML + OCR)** |
| **Pixel Redaction Mechanism** | ❌ None | ❌ None | ❌ None | ❌ None | **Destructive Offscreen Canvas2D (Blackout/Blur/Mask)** |
| **Prompt Injection Protection** | ❌ Vulnerable | ❌ Vulnerable | ❌ N/A | ❌ N/A | **✅ Whitelisted Action Schema & Sanitizer** |
| **Fail-Closed Firewall** | ❌ None | ❌ None | ⚠️ Pass-through on failure | ❌ Drop URL only | **✅ Pre-Flight Outbound Interceptor** |
| **Google Forms & Shadow DOM** | ⚠️ Partial | ❌ Fails on iframes | ❌ Cannot parse | ❌ N/A | **✅ Universal Deep Frame Bridge (`all_frames: true`)** |
| **Client Memory Overhead** | ~12 MB | >150 MB (Node.js) | Server-bound | <15 MB | **~18.4 MB JS Heap (On-demand WebGPU/WASM)** |
| **End-to-End Latency** | 2,500 – 4,000 ms | 1,800 – 3,500 ms | 200 – 600 ms | <5 ms | **~657 ms (64 ms local redaction)** |

---

## 3. Technology Stack & Architectural Engineering

PrivacyVision is engineered around a modular, defense-in-depth architecture spanning client-side browser execution, local machine learning acceleration, and autonomous action planning.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT BROWSER (Chrome MV3)                              │
│                                                                                        │
│  Active Tab (e.g. Enterprise Portal, Google Forms, Bank Services, KYC Dashboard)       │
│    │                                                                                   │
│    ├── Content Script (dom-extractor.ts + mutation-watcher.ts)                         │
│    │    ├── Scans Interactive Affordances (buttons, inputs, links, textareas)          │
│    │    ├── Shadow DOM & Cross-Frame Traversal (frame-bridge.ts)                       │
│    │    └── Sanitizes node.text, value, placeholder via RegexDetector                  │
│    │                                                                                   │
│    ├── Background Service Worker (service-worker.ts)                                   │
│    │    ├── Captures active tab visual buffer via chrome.tabs.captureVisibleTab        │
│    │    ├── Coordinates UnifiedPrivacyEngine Multi-Signal Pipeline                     │
│    │    └── Routes raw buffer to isolated Offscreen Document                           │
│    │                                                                                   │
│    ├── Sandboxed Offscreen Canvas (offscreen.ts + redactor.ts)                         │
│    │    ├── Renders original pixels into isolated OffscreenCanvas                      │
│    │    ├── Applies Device-Pixel-Ratio (DPR) coordinate scaling                        │
│    │    └── Executes Destructive Canvas2D Redactions:                                  │
│    │         • BLACKOUT: Passwords, OTPs, PINs, API Keys, Tokens                       │
│    │         • GAUSSIAN BLUR: Human Faces (via BlazeFace ONNX)                         │
│    │         • MASK: Emails, Phone Numbers, Aadhaar, PAN, Cards, UPI                   │
│    │                                                                                   │
│    └── Pre-Flight Privacy Firewall (firewall.ts)                                       │
│         ├── Inspects outgoing screenshot: Ensures data URL is sanitized                │
│         ├── Inspects structural nodes: Verifies [REDACTED] markers                     │
│         └── Fails closed if any unredacted raw pattern is detected                     │
└────────────────────────────────────────────┬───────────────────────────────────────────┘
                                             │
                                  SANITIZED CONTEXT ONLY
                        (Redacted Screenshot + Blinded Node IDs)
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL BACKEND / CLOUD VLM AGENT                              │
│                                                                                        │
│  FastAPI Autonomous Server (app/main.py — localhost:8000 or Render/Railway)           │
│    ├── OS Background Daemon (macOS launchd / Linux systemd / Windows Startup)          │
│    ├── Scene Classifier (services/classifier.py): MobileViT ONNX                       │
│    ├── VLM Reasoning Coordinator (services/vlm.py): LLaVA / Qwen2-VL / Gemini Flash     │
│    ├── Action Parser (services/action_parser.py): Structured Action JSON Extraction   │
│    └── Server Security Validator (security/payload_validator.py): Re-verifies no raw PII│
└────────────────────────────────────────────┬───────────────────────────────────────────┘
                                             │
                                  CONSTRAINED ACTION JSON
                          { action: "CLICK", target: "el-29" }
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT EXECUTION ENGINE                                 │
│                                                                                        │
│  Action Validator & Executor (action-validator.ts + action-executor.ts)                │
│    ├── Schema Validation against Whitelisted Actions: CLICK, SCROLL, FOCUS, TYPE...    │
│    ├── Bounds & Safety Checks: Element visibility, disabled state, script injection   │
│    └── Synthetic Human Dispatch: PointerDown → MouseDown → PointerUp → MouseUp → Click │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Dataset Curation, Training Pipeline & Methodology

### 4.1 Dataset Sourcing
To train the on-device page classifier and calibrate the multi-signal detection rules, we compiled a multi-source dataset comprising over **9,900 samples**:

1. **Hugging Face WebSight Dataset (Sub-sample of 5,000 UI designs):**
   - Real-world web layouts converted to screenshot image-code pairs.
   - Used to extract bounding box geometry for buttons, navigation bars, headers, and hero banners.

2. **Rico Mobile & Web UI Dataset (2,500 interactive screens):**
   - Provides ground-truth bounding box hierarchies for complex input forms, modal overlays, and login cards.

3. **Synthetic KYC & Banking Dataset (1,200 generated samples):**
   - Procedurally generated Aadhaar representations (formatted as `XXXX XXXX XXXX`), PAN cards (`[A-Z]{5}[0-9]{4}[A-Z]{1}`), phone numbers (`+91 9XXXX XXXXX`), UPI IDs (`user@okhdfcbank`, `user@paytm`), and IFSC codes (`SBIN0001234`).
   - Generated with diverse CSS styling, font families, dark/light themes, and varying contrast ratios.

4. **Synthetic Webpage Scene Classification Dataset (1,200 curated images):**
   - Six distinct functional classes: `login`, `payment`, `form`, `pii`, `dashboard`, `modal`.
   - 200 samples per class (100 base algorithmic renders + 100 augmented variations).

### 4.2 Data Augmentation Pipeline
Each base screenshot was subjected to stochastic augmentations using Pillow and NumPy:
- **Rotational Jitter:** Uniform distribution $\mathcal{U}(-5^\circ, +5^\circ)$ with edge padding.
- **Color & Photometric Jitter:** Brightness factor $\mathcal{U}(0.85, 1.15)$, contrast factor $\mathcal{U}(0.90, 1.10)$.
- **Spatial Crop & Rescaling:** Random bounding crop up to 5% followed by Lanczos-3 interpolation back to 256×256 pixels.
- **Additive Uniform Noise:** RGB channel jitter $[0, 8]$ simulating web compression artifacts.

---

## 5. Experimental Results & Performance Evaluation

### 5.1 Model & Detection Evaluation Metrics

```
================================================================================
                    PRIVACYVISION BENCHMARK SCORECARD
================================================================================
  Visual Context Accuracy:              96.5%
  Detection Precision (Weighted):       0.982
  Detection Recall (Weighted):          0.954
  Overall F1-Score:                     0.968
  Mean Intersection-over-Union (IoU):   0.884
  Outbound Leak Rate (Fail-Closed):     0.000% (0 leaks across 500 trials)
================================================================================
```

### 5.2 Latency Stopwatch Breakdown

| Pipeline Stage | Component | Typical Latency | Description |
| :--- | :--- | :---: | :--- |
| **Stage 1** | Tab Screenshot Capture | **65 ms** | `chrome.tabs.captureVisibleTab` PNG compression |
| **Stage 2** | DOM Node Extraction | **14 ms** | TreeWalker interactive affordance traversal |
| **Stage 3** | Multi-Signal Privacy Engine | **45 ms** | DOM + Semantic + Checksum Regex scanning |
| **Stage 4** | BlazeFace Neural Inference | **16 ms** | WebGPU/WASM tensor inference on 128×128 canvas |
| **Stage 5** | Offscreen Canvas Redaction | **18 ms** | DPR-scaled destructive pixel blackout/blur/mask |
| **Stage 6** | Pre-Flight Privacy Firewall | **4 ms** | In-memory outbound verification check |
| **Stage 7** | Network Round-Trip & VLM | **480 ms** | Sanitized context transmission to local LLaVA |
| **Stage 8** | Client Action Validation & Dispatch | **15 ms** | Schema validation and synthetic mouse event dispatch |
| **Total Cycle** | **End-to-End Execution** | **~657 ms** | Sub-second real-time interactive performance |

---

## 6. Real-World Case Study: Live University Portal (DSCE)

Testing on the live contact directory of **Dayananda Sagar College of Engineering** (`dsce.edu.in/contact-us`):
- **Detection Phase:** The page presents dense tables with departmental phone numbers (`080-42161708`, `080-42161753`), official email links (`ppl-dsce@dayanandasagar.edu`, `admissions@dayanandasagar.edu`), and faculty portraits.
- **Multi-Signal Engine:** Identified **48 individual PII candidates** across text, table cells, and links.
- **Fail-Closed Verification:** When an interactive anchor tag (`<a href="mailto:...">`) carried raw email text, the Privacy Firewall intercepted the outbound transmission (`Raw EMAIL pattern detected in node text for el-29`), proving fail-closed security.
- **Sanitized Execution:** With complete node-text sanitization active, emails were masked as `[EMAIL_REDACTED]`, phone numbers as `[PHONE_REDACTED]`, the firewall transitioned to **✓ SAFE**, and the autonomous agent proceeded with 100% data safety.

---

## 7. Future Scope & Research Roadmap

1. **Edge Small Language Models (SLMs) in WebGPU:** Deploying 2B–3B reasoning models (Google Gemma-2 2B, Microsoft Phi-3.5 Mini) directly inside the browser extension via WebGPU to remove external server dependencies completely.
2. **Zero-Knowledge Redaction Proofs (zk-SNARKs):** Generating cryptographic mathematical proofs certifying full redaction compliance without disclosing underlying user data.
3. **Differential Privacy on Visual Tokens:** Adding calibrated mathematical noise to visual embeddings to prevent neural feature inversion attacks.

---

## 8. Conclusion

PrivacyVision proves that autonomous AI browser agents do not need to compromise user privacy to achieve high operational autonomy. By shifting visual perception, checksum validation, biometric face detection, and destructive canvas redaction directly to client hardware, PrivacyVision delivers a robust, sub-second, zero-knowledge browser automation platform.

---
*© 2026 Sarvagya Chaturvedi & Team PrivacyVision. Distributed under the MIT License.*
