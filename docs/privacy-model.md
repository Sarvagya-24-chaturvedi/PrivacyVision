# Multi-Signal Privacy Engine & Risk Scoring Model

## 1. Multi-Signal Scoring Formulation

Rather than relying on naive substring matching (e.g. `input.name.includes("password")`), PrivacyVision aggregates weighted probabilistic evidence across structural, semantic, pattern, and visual perception layers:

$$\text{Risk Score} = \min\left(1.0, \, \sum_{i} w_i \cdot \mathbb{I}(\text{signal}_i) + \text{boost}\right)$$

| Signal Source | Weight ($w_i$) | Examples |
| :--- | :---: | :--- |
| **DOM Attributes** | $+0.30$ | `type="password"`, `type="tel"`, `type="email"` |
| **Semantic Labels** | $+0.35$ | `<label for="...">`, `aria-label`, adjacent table headers |
| **Autocomplete** | $+0.20$ | `autocomplete="current-password"`, `cc-number` |
| **Regex / Pattern** | $+0.25$ | Aadhaar, PAN, Card Luhn check, Indian Phone |
| **Face Perception** | $+0.35$ | Human portrait detected in DOM/canvas visual |
| **Visual OCR** | $+0.20$ | Rendered canvas string detected in pixel memory |
| **Vision Model** | $+0.25$ | On-device ONNX WebGPU/WASM classification |

### Direct Synergistic Boosts
- **DOM + Semantic**: $+0.15$
- **Regex + Semantic**: $+0.20$

---

## 2. Confidence Classification Tiers

- **HIGH ($\ge 0.85$)**:
  - Always redacted.
  - Credentials (passwords, PINs, OTPs, API keys) $\rightarrow$ `BLACKOUT`.
  - Sensitive personal records $\rightarrow$ `MASK`.
- **MEDIUM ($0.60 - 0.84$)**:
  - Redacted under defensive policy if credential, financial, or identity data.
- **LOW ($< 0.60$)**:
  - Preserved unless high contextual risk exists.

---

## 3. Indian National Identifiers & Payment Algorithms

### 1. Aadhaar (12 Digits with Verhoeff Checksum)
- RegEx: `\b[2-9]{1}[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b`
- Validates the base-10 dihedral permutation group $D_5$ (Verhoeff checksum).
- Prevents false positives on arbitrary 12-digit numbers.

### 2. Permanent Account Number (PAN)
- RegEx: `\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b`
- Detects the 10-character alphanumeric Indian Income Tax identifier.

### 3. Unified Payments Interface (UPI ID)
- RegEx: `\b[a-zA-Z0-9.\-_]{2,64}@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|ibl|upi|axl|apl)\b`

### 4. Credit & Debit Cards (Luhn Algorithm)
- Evaluates checksum over mod 10 doubling every second digit from right to left.
- Rejects invalid number sequences.

---

## 4. Bounding Box Fusion Layer

When visual OCR, DOM elements, and face detectors produce overlapping bounding boxes, the **Bounding Box Merger (`BBoxMerger`)** applies an Intersection over Union (IoU) clustering pass:

$$\text{IoU}(B_1, B_2) = \frac{\text{Area}(B_1 \cap B_2)}{\text{Area}(B_1 \cup B_2)}$$

If $\text{IoU} \ge 0.25$ or if one box is substantially contained ($> 50\%$) within another:
1. Enclosing bounding box is computed: $[ \min(x), \min(y), \max(x+w), \max(y+h) ]$.
2. Highest confidence is retained.
3. Strongest action takes precedence (`BLACKOUT` $>$ `MASK` $>$ `BLUR`).
4. Sources are unified to prevent multiple redaction artifacts on screen.
