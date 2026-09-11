"""
Exports the fine-tuned MobileViT model to ONNX format.
Must run train.py first to generate checkpoints.

Usage: python export_onnx.py
"""
import sys
import os
from pathlib import Path

import torch
from transformers import MobileViTForImageClassification, MobileViTConfig

CHECKPOINT_DIR = Path(__file__).parent / "checkpoints"
OUT_MODEL = Path(__file__).parent.parent / "extension" / "public" / "models" / "mobilevit_browser_classifier.onnx"
OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)

CLASS_NAMES = ["login", "payment", "form", "pii", "dashboard", "modal"]
IMG_SIZE = 256


def load_best_model():
    if not (CHECKPOINT_DIR / "best_model.pt").exists():
        print("ERROR: No checkpoint found. Run train.py first.")
        sys.exit(1)
    config = MobileViTConfig.from_pretrained(CHECKPOINT_DIR)
    model = MobileViTForImageClassification(config)
    state_dict = torch.load(CHECKPOINT_DIR / "best_model.pt", map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model


def export_onnx(model):
    dummy_input = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
    print(f"Exporting ONNX model to: {OUT_MODEL}")

    torch.onnx.export(
        model,
        {"pixel_values": dummy_input},
        str(OUT_MODEL),
        opset_version=14,
        input_names=["pixel_values"],
        output_names=["logits"],
        dynamic_axes={
            "pixel_values": {0: "batch"},
            "logits": {0: "batch"}
        },
        do_constant_folding=True,
    )
    print("ONNX model exported")

    # Simplify
    try:
        import onnx
        from onnxsim import simplify
        model_onnx = onnx.load(str(OUT_MODEL))
        simplified, ok = simplify(model_onnx)
        if ok:
            onnx.save(simplified, str(OUT_MODEL))
            print("ONNX model simplified")
    except ImportError:
        print("onnxsim not found, skipping simplification")

    # Print model info
    import onnx
    m = onnx.load(str(OUT_MODEL))
    print(f"Model size: {OUT_MODEL.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"Input: {[d.dim_value for d in m.graph.input[0].type.tensor_type.shape.dim]}")
    print(f"Output: {[d.dim_value for d in m.graph.output[0].type.tensor_type.shape.dim]}")
    print(f"Classes: {CLASS_NAMES}")


if __name__ == "__main__":
    model = load_best_model()
    export_onnx(model)
