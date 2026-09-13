# Contributing to PrivacyVision 🛡️

Thank you for your interest in contributing to **PrivacyVision**! We welcome contributions from developers, researchers, and security enthusiasts of all skill levels.

---

## 🌟 How Can You Help?
- 🐛 **Report Bugs**: Submit detailed bug reports with reproducible steps.
- 💡 **Suggest Features**: Propose new privacy safeguards, vision models, or UI enhancements.
- 📖 **Improve Documentation**: Enhance guides, setup instructions, or visual diagrams.
- 🛠️ **Submit Code**: Implement bug fixes, performance optimizations, or new capabilities.

---

## 🚀 Getting Started

### 1. Fork & Clone
```bash
# Fork the repository on GitHub, then clone your fork:
git clone https://github.com/<your-username>/PrivacyVision.git
cd PrivacyVision
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI dev server
uvicorn server.app.main:app --reload --port 8000
```

### 3. Chrome Extension Setup
```bash
cd extension
npm install
npm run build      # Build dist folder
npm run watch      # For continuous build during development
```

Load the unpacked extension in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/dist` folder.

---

## 🧪 Running Tests

Ensure all automated tests pass before submitting your PR:

### Extension Tests (Vitest)
```bash
cd extension
npm test
```

### Backend Tests (Pytest)
```bash
pytest server/tests
```

---

## 📝 Pull Request Guidelines

1. Create a descriptive branch: `git checkout -b feat/your-feature-name` or `fix/your-bug-fix`.
2. Make clean, atomic commits following conventional commit format (`feat: ...`, `fix: ...`, `docs: ...`).
3. Add or update tests where applicable.
4. Ensure code passes all existing tests.
5. Push your branch and open a Pull Request against `model-integration` (or `main`).
6. Fill out the Pull Request template with details of your changes.

---

## 🛡️ Code of Conduct
We are committed to providing a friendly, safe, and welcoming environment for all contributors regardless of background or experience level. Please be respectful, constructive, and kind.
