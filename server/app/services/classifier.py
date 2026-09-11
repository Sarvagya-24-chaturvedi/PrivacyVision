"""
Server-side MobileViT browser scene classifier.
Loads the same ONNX model as the client extension and classifies page type
from sanitized screenshots to improve VLM reasoning context.
"""
import os
import base64
import io
from typing import Optional
from pathlib import Path

try:
    import numpy as np
except ImportError:  # The agent remains usable before optional ML dependencies are installed.
    np = None

CLASS_NAMES = ["login", "payment", "form", "pii", "dashboard", "modal"]
MODEL_PATH = Path(__file__).parent.parent.parent.parent / "extension" / "public" / "models" / "mobilevit_browser_classifier.onnx"
IMG_SIZE = 256

_session = None


def _load_session():
    global _session
    if _session is not None:
        return _session
    if np is None or not MODEL_PATH.exists():
        return None
    try:
        import onnxruntime as ort
        _session = ort.InferenceSession(
            str(MODEL_PATH),
            providers=["CPUExecutionProvider"]
        )
        print(f"[Classifier] MobileViT ONNX loaded from {MODEL_PATH}")
        return _session
    except Exception as e:
        print(f"[Classifier] Failed to load ONNX model: {e}")
        return None


def classify_screenshot(screenshot_b64: str) -> dict:
    """
    Classifies a sanitized screenshot into a page type.
    Returns: {page_type: str, confidence: float, all_scores: dict}
    """
    session = _load_session()
    if session is None:
        return {
            "page_type": "unknown",
            "confidence": 0.0,
            "all_scores": {},
            "note": "Model not available — run model-training/train.py and export_onnx.py first"
        }

    try:
        from PIL import Image
        # Decode base64 screenshot
        if "," in screenshot_b64:
            screenshot_b64 = screenshot_b64.split(",")[1]
        img_bytes = base64.b64decode(screenshot_b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = (arr - 0.5) / 0.5
        inp = arr.transpose(2, 0, 1)[np.newaxis, ...]  # [1, 3, 256, 256]

        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: inp})
        logits = outputs[0][0]
        
        # Softmax
        exp_logits = np.exp(logits - logits.max())
        probs = exp_logits / exp_logits.sum()
        
        pred_idx = int(np.argmax(probs))
        return {
            "page_type": CLASS_NAMES[pred_idx],
            "confidence": float(probs[pred_idx]),
            "all_scores": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}
        }
    except Exception as e:
        return {
            "page_type": "unknown",
            "confidence": 0.0,
            "all_scores": {},
            "error": str(e)
        }
