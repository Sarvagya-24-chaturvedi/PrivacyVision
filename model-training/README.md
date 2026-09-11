# MobileViT Browser Scene Classifier — Training Pipeline (SIH26171)

## Overview
Fine-tunes `apple/mobilevit-small` to classify webpage screenshots into 6 categories:
`login`, `payment`, `form`, `pii`, `dashboard`, `modal`

The trained model is exported to ONNX and deployed:
- **Client-side**: Loaded in Chrome Extension via ONNX Runtime Web (WebGPU/WASM)
- **Server-side**: Loaded in FastAPI server via `onnxruntime` for independent verification

## Quick Start

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Build training dataset (generates synthetic webpage screenshots)
python dataset_builder.py

# 3. Train MobileViT model
# CPU: ~4 hours for 15 epochs
# GPU (CUDA): ~20-30 minutes
python train.py --epochs 15 --batch-size 16

# 4. Export to ONNX
python export_onnx.py
# Saves to: extension/public/models/mobilevit_browser_classifier.onnx

# 5. Evaluate (real metrics — no fake values)
python evaluate.py
# Saves real measured metrics to: docs/benchmark_results.json
```

## Dataset
- **6 classes**: login, payment, form, pii, dashboard, modal
- **200 images/class**: 100 base renders × 2 augmentation passes = 200
- **Total**: 1,200 images (train: ~1,020, val: ~180)
- Augmentations: rotation ±5°, brightness/contrast jitter, random crop

## Model Architecture
- Base: `apple/mobilevit-small` (5.6M parameters)
- Fine-tuned head: replaced final FC layer with 6-class classifier
- Input: 256×256 RGB, normalized `mean=[0.5,0.5,0.5]`, `std=[0.5,0.5,0.5]`
- Output: 6-class logits

## ONNX Export Details
- Opset: 14
- Input: `pixel_values` — `[1, 3, 256, 256]` float32
- Output: `logits` — `[1, 6]` float32
- ONNX Simplifier applied
