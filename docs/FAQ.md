# Frequently Asked Questions (FAQ) & Troubleshooting 🛡️

Here you'll find answers to common questions about installing, configuring, and running **PrivacyVision**.

---

## ❓ General Questions

### 1. Does PrivacyVision store or transmit my personal sensitive data?
**No.** PrivacyVision utilizes a local-first privacy pipeline. All PII (passwords, payment numbers, emails, addresses, and phone numbers) are redacted directly inside your browser before visual frames or DOM trees are processed.

### 2. Can I use PrivacyVision completely free of charge?
**Yes!**
- The Chrome extension is open-source and free to load in Developer Mode.
- The backend supports **Google Gemini 1.5 Flash**, which offers a free tier (up to 15 requests per minute).
- The server also includes an offline rule-based fallback if no external API key is provided.

### 3. Which browsers are supported?
PrivacyVision works on all Chromium-based desktop browsers:
- Google Chrome
- Brave Browser
- Microsoft Edge
- Arc Browser
- Opera / Vivaldi

---

## ⚙️ Setup & Troubleshooting

### Q: "Failed to connect to backend service" error in popup
**Solution**:
1. Check if the local backend server is running:
   ```bash
   uvicorn server.app.main:app --reload --port 8000
   ```
2. Open `http://localhost:8000/health` in your browser. You should see `{"status": "healthy"}`.
3. If using a remote cloud backend (like Render), make sure your backend URL is set in the extension popup settings.

### Q: How do I get a Gemini API key?
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **Create API Key**.
3. Add `GEMINI_API_KEY=your_key_here` to your `.env` file in the project root.

---

## 🤝 Community & Support
If you encounter any bugs or have feature ideas, feel free to open an issue or pull request on GitHub!
