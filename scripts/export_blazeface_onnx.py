"""
Exports BlazeFace from TensorFlow to ONNX format.
Requires: tensorflow, tf2onnx
Usage: python export_blazeface_onnx.py
"""
import subprocess
import sys
import os

def main():
    print("Installing dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                           "tensorflow>=2.13", "tf2onnx>=1.16", "onnxruntime"])

    import tensorflow as tf
    import tf2onnx
    import onnx
    print(f"TF version: {tf.__version__}")

    # Download BlazeFace from TF Hub
    hub_url = "https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1"
    print(f"Loading BlazeFace from {hub_url}...")
    model = tf.saved_model.load(hub_url)
    
    # Export to ONNX
    output_path = os.path.join(os.path.dirname(__file__), 
                               "../extension/public/models/blazeface.onnx")
    print(f"Converting to ONNX...")
    model_proto, _ = tf2onnx.convert.from_keras(
        model,
        input_signature=[tf.TensorSpec([1, 128, 128, 3], tf.float32, name='input')],
        opset=13,
        output_path=output_path
    )
    print(f"✓ BlazeFace ONNX exported to {output_path}")

if __name__ == "__main__":
    main()
