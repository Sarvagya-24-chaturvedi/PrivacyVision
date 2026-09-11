"""
Evaluates the exported ONNX model on the held-out test set.
Reports real metrics (NO fake values).

Usage: python evaluate.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import onnxruntime as ort
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)

ONNX_MODEL = Path(__file__).parent.parent / "extension" / "public" / "models" / "mobilevit_browser_classifier.onnx"
DATA_DIR = Path(__file__).parent / "data"
CLASS_NAMES = ["login", "payment", "form", "pii", "dashboard", "modal"]
IMG_SIZE = 256


def preprocess(img_path: Path) -> np.ndarray:
    img = Image.open(img_path).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - 0.5) / 0.5
    return arr.transpose(2, 0, 1)[np.newaxis, ...]  # [1, 3, H, W]


def load_test_images():
    images, labels = [], []
    for cls_idx, cls_name in enumerate(CLASS_NAMES):
        cls_dir = DATA_DIR / cls_name
        if not cls_dir.exists():
            continue
        files = sorted(cls_dir.glob("*.png"))
        # Use last 20% of files as test set
        n_test = max(1, len(files) // 5)
        test_files = files[-n_test:]
        for f in test_files:
            images.append(f)
            labels.append(cls_idx)
    return images, labels


def evaluate():
    if not ONNX_MODEL.exists():
        print(f"ERROR: ONNX model not found at {ONNX_MODEL}")
        print("Run export_onnx.py first.")
        return

    sess = ort.InferenceSession(str(ONNX_MODEL))
    input_name = sess.get_inputs()[0].name
    print(f"Model loaded: {ONNX_MODEL}")
    print(f"Input name: {input_name}")

    image_paths, true_labels = load_test_images()
    print(f"Test set: {len(image_paths)} images")

    pred_labels = []
    for path in image_paths:
        inp = preprocess(path)
        outputs = sess.run(None, {input_name: inp})
        logits = outputs[0][0]
        pred = int(np.argmax(logits))
        pred_labels.append(pred)

    # Metrics
    acc = accuracy_score(true_labels, pred_labels)
    prec = precision_score(true_labels, pred_labels, average='weighted', zero_division=0)
    rec = recall_score(true_labels, pred_labels, average='weighted', zero_division=0)
    f1 = f1_score(true_labels, pred_labels, average='weighted', zero_division=0)
    cm = confusion_matrix(true_labels, pred_labels)

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS (REAL MEASURED METRICS -- NOT FAKE)")
    print("=" * 60)
    print(f"Accuracy:  {acc:.4f} ({acc*100:.1f}%)")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(true_labels, pred_labels, target_names=CLASS_NAMES, zero_division=0))
    print("\nConfusion Matrix:")
    print(cm)

    # Save results
    results = {
        "accuracy": float(acc),
        "precision_weighted": float(prec),
        "recall_weighted": float(rec),
        "f1_weighted": float(f1),
        "confusion_matrix": cm.tolist(),
        "class_names": CLASS_NAMES,
        "test_samples": len(image_paths),
        "note": "Real measured metrics on held-out test set -- no fake values"
    }
    out_path = Path(__file__).parent.parent / "docs" / "benchmark_results.json"
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    evaluate()
