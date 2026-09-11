#!/usr/bin/env bash
set -e

MODELS_DIR="$(dirname "$0")/../extension/public/models"
mkdir -p "$MODELS_DIR/tessdata"

echo "Downloading Tesseract English language data..."
curl -fL "https://github.com/naptha/tessdata/blob/gh-pages/4.0.0/eng.traineddata.gz?raw=true" \
  -o "$MODELS_DIR/tessdata/eng.traineddata.gz"
gunzip -f "$MODELS_DIR/tessdata/eng.traineddata.gz"
echo "✓ Tesseract tessdata downloaded"

echo ""
echo "NOTE: BlazeFace ONNX model (blazeface.onnx) needs to be placed at:"
echo "  $MODELS_DIR/blazeface.onnx"
echo ""
echo "Download it from: https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1"
echo "Convert to ONNX using the model-training/export_blazeface_onnx.py script."
echo ""
echo "For immediate demo use, the extension falls back to semantic heuristics if blazeface.onnx is missing."
