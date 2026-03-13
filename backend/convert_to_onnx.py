"""
convert_to_onnx.py
──────────────────
Run this ONCE on your laptop to convert your existing models to ONNX.
After conversion, upload the .onnx files to Railway via /backend/models/

Requirements (laptop only):
    pip install tf2onnx tensorflow torch torchvision onnxruntime

Usage:
    python convert_to_onnx.py
"""

import os

# ─────────────────────────────────────────────────────────────────────────────
# 1. Convert kather_mobilenet_model.keras → kather_mobilenet.onnx
# ─────────────────────────────────────────────────────────────────────────────
def convert_keras_to_onnx():
    print("\n── Converting Kather MobileNet (.keras → .onnx) ──")
    try:
        import tensorflow as tf
        import tf2onnx

        INPUT_PATH  = "backend/models/kather_mobilenet_model.keras"
        OUTPUT_PATH = "backend/models/kather_mobilenet.onnx"

        if not os.path.exists(INPUT_PATH):
            print(f"  ❌ Not found: {INPUT_PATH}")
            return

        model = tf.keras.models.load_model(INPUT_PATH, compile=False)
        print(f"  ✅ Loaded: {INPUT_PATH}")
        print(f"  Input shape: {model.input_shape}")

        # Convert
        model_proto, _ = tf2onnx.convert.from_keras(
            model,
            input_signature=[
                tf.TensorSpec(shape=(None, 224, 224, 3), dtype=tf.float32, name="input")
            ],
            opset=13,
            output_path=OUTPUT_PATH,
        )

        size_mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024
        print(f"  ✅ Saved: {OUTPUT_PATH} ({size_mb:.1f} MB)")

    except Exception as e:
        print(f"  ❌ Conversion failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Convert unet_model.pth → unet_segmentation.onnx
# ─────────────────────────────────────────────────────────────────────────────
def convert_pytorch_to_onnx():
    print("\n── Converting U-Net (.pth → .onnx) ──")
    try:
        import torch
        import sys

        # Add backend/ to path so we can import unet_arch
        sys.path.insert(0, "backend")

        INPUT_PATH  = "backend/models/unet_model.pth"
        ARCH_PATH   = "backend/unet_arch.py"
        OUTPUT_PATH = "backend/models/unet_segmentation.onnx"

        if not os.path.exists(INPUT_PATH):
            print(f"  ❌ Not found: {INPUT_PATH}")
            return

        if not os.path.exists(ARCH_PATH):
            print(f"  ❌ Not found: {ARCH_PATH} — needed to define UNet class")
            return

        from unet_arch import UNet

        state = torch.load(INPUT_PATH, map_location="cpu")
        model = UNet()
        model.load_state_dict(state)
        model.eval()
        print(f"  ✅ Loaded: {INPUT_PATH}")

        # Create a dummy input matching model's expected shape
        dummy = torch.randn(1, 3, 224, 224)

        torch.onnx.export(
            model,
            dummy,
            OUTPUT_PATH,
            opset_version=11,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={
                "input":  {0: "batch_size"},
                "output": {0: "batch_size"},
            },
        )

        size_mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024
        print(f"  ✅ Saved: {OUTPUT_PATH} ({size_mb:.1f} MB)")

    except Exception as e:
        print(f"  ❌ Conversion failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Verify both .onnx files work correctly
# ─────────────────────────────────────────────────────────────────────────────
def verify_onnx_models():
    print("\n── Verifying ONNX models ──")
    try:
        import onnxruntime as ort
        import numpy as np

        models_to_check = [
            ("backend/models/kather_mobilenet.onnx",   (1, 3, 224, 224)),
            ("backend/models/unet_segmentation.onnx",  (1, 3, 224, 224)),
        ]

        for path, shape in models_to_check:
            if not os.path.exists(path):
                print(f"  ⚠️  Skipping (not found): {path}")
                continue

            sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
            inp_name = sess.get_inputs()[0].name
            dummy    = np.random.randn(*shape).astype(np.float32)
            output   = sess.run(None, {inp_name: dummy})
            print(
                f"  ✅ {os.path.basename(path)} — "
                f"input: {shape} → output: {output[0].shape}"
            )

    except Exception as e:
        print(f"  ❌ Verification failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  Errorbite — ONNX Model Conversion Script")
    print("=" * 55)
    convert_keras_to_onnx()
    convert_pytorch_to_onnx()
    verify_onnx_models()
    print("\n✅ Done! Upload the .onnx files to Railway via /backend/models/")
    print("   Then rename main_onnx.py → main.py and use requirements_onnx.txt")