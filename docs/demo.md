# Step-by-Step Demonstration Guide for SIH Judges

This document provides exact steps to demonstrate all 6 required demo scenarios for **SIH26171**.

---

## Prerequisites
1. Start the FastAPI backend:
   ```bash
   cd server
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```
2. Build the extension:
   ```bash
   cd extension
   npm run build
   ```
3. In Chrome:
   - Navigate to `chrome://extensions`
   - Turn on **Developer mode** (top right)
   - Click **Load unpacked** and select the `extension/dist` directory.

---

## Demo Scenarios

### DEMO 1 — Login Page
- **URL**: Open `demo/login/index.html` in Chrome.
- **Content**: Email (`john@example.com`) and Password (`secretPassword123`).
- **Demonstration**:
  1. Open PrivacyVision popup.
  2. Click **[Capture Context]**.
  3. Switch to **Before / After** tab: Observe that email and password are blacked out on the sanitized screenshot.
  4. Click **[Run Agent]**: The remote VLM identifies the "Sign In" button without ever receiving credentials. The button is clicked on the webpage.

### DEMO 2 — Payment Gateway
- **URL**: Open `demo/payment/index.html`.
- **Content**: Card number (`4111 1111 1111 1111`), CVV (`789`), Expiry (`12/28`), and UPI ID (`sarvagya@okhdfcbank`).
- **Demonstration**:
  1. Click **[Toggle Overlay]**: Observe bounding boxes with confidence labels on payment fields.
  2. Click **[Run Agent]**: VLM understands "payment form with a Pay button" and clicks "Complete Payment".

### DEMO 3 — Indian KYC / PII
- **URL**: Open `demo/pii/index.html`.
- **Content**: Aadhaar (`2345 6789 0123`), PAN (`ABCDE1234F`), Phone (`+91 9876543210`), and Address.
- **Demonstration**:
  1. Click **[Privacy Scan]**: Detailed log entries display detection of Indian national identifiers with Verhoeff validation.
  2. Click **[Capture Context]**: All Indian IDs are masked with `[AADHAAR_REDACTED]`, `[PAN_REDACTED]`, `[PHONE_REDACTED]`.

### DEMO 4 — Visual-Only Canvas PII
- **URL**: Open `demo/ocr/index.html`.
- **Content**: Sensitive email rendered directly into pixel memory on an HTML5 canvas with zero DOM text nodes.
- **Demonstration**:
  1. Click **[Capture Context]**: Local OCR detects text on the canvas and blurs/masks the region.

### DEMO 5 — Biometric Face Blurring
- **URL**: Open `demo/face/index.html`.
- **Content**: User profile with a visible human portrait.
- **Demonstration**:
  1. Click **[Capture Context]**: Local face detector locates the portrait.
  2. View **Before / After**: The face is blurred with a Gaussian filter before upload.

### DEMO 6 — Multi-Step Agent Navigation
- **URL**: Open `demo/navigation/index.html`.
- **Content**: Continue button is hidden below the viewport fold.
- **Demonstration**:
  1. Enter task: "Scroll down and click continue".
  2. Click **[Run Agent]**: The VLM commands `SCROLL` down, the page scrolls smoothly, revealing the button, and executes `CLICK`.
