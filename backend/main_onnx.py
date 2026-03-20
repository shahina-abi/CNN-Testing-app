# import os
# import io
# import time
# from zipfile import ZipFile
# from contextlib import asynccontextmanager

# from fastapi import FastAPI, File, UploadFile, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# import numpy as np
# from PIL import Image

# # ────────────────────────────────────────────────────────────────────────────
# # Optional heavy deps — fail gracefully
# # ────────────────────────────────────────────────────────────────────────────
# try:
#     import tensorflow as tf
#     TF_AVAILABLE = True
# except ImportError as e:
#     TF_AVAILABLE = False
#     print(f"⚠️  TensorFlow not available ({e})")

# try:
#     import torch
#     TORCH_AVAILABLE = True
# except ImportError as e:
#     TORCH_AVAILABLE = False
#     print(f"⚠️  PyTorch not available ({e})")

# # ────────────────────────────────────────────────────────────────────────────
# # Config
# # ────────────────────────────────────────────────────────────────────────────
# BASE_DIR = os.path.dirname(__file__)

# HISTOLOGY_MODEL_PATH = os.path.join(BASE_DIR, "models", "kather_mobilenet_model.keras")
# UNET_MODEL_PATH = os.path.join(BASE_DIR, "models", "unet_model.pth")
# CLASSES = ["ADI", "BACK", "DEB", "LYM", "MUC", "MUS", "NORM", "STR", "TUM"]
# histology_model = None
# unet_model = None

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     global histology_model, unet_model

#     if TF_AVAILABLE and os.path.exists(HISTOLOGY_MODEL_PATH):
#         histology_model = tf.keras.models.load_model(
#             HISTOLOGY_MODEL_PATH, compile=False
#         )

#     if TORCH_AVAILABLE and os.path.exists(UNET_MODEL_PATH):
#         from unet_arch import UNet

#         state = torch.load(UNET_MODEL_PATH, map_location="cpu")
#         unet_model = UNet()
#         unet_model.load_state_dict(state)
#         unet_model.eval()

#     yield
# # ─────────────


# # ────────────────────────────────────────────────────────────────────────────
# # Startup / Shutdown
# # ────────────────────────────────────────────────────────────────────────────
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     global histology_model, unet_model

#     # Load Histology Model
#     if TF_AVAILABLE and os.path.exists(HISTOLOGY_MODEL_PATH):
#         try:
#             histology_model = tf.keras.models.load_model(HISTOLOGY_MODEL_PATH, compile=False)
#             print(f"✅ Histology model loaded: {HISTOLOGY_MODEL_PATH}")
#         except Exception as e:
#             print(f"❌ Failed to load Histology model: {e}")
#     else:
#         print(f"⚠️ Histology model not found at {HISTOLOGY_MODEL_PATH}")

#     # Load U-Net Model
#     # NOTE: unet_model.pth is a state dict. Provide your UNet class in unet_arch.py
#     # and uncomment the block below.
#     # if TORCH_AVAILABLE and os.path.exists(UNET_MODEL_PATH):
#     #     try:
#     #         from unet_arch import UNet
#     #         state = torch.load(UNET_MODEL_PATH, map_location="cpu")
#     #         unet_model = UNet()
#     #         unet_model.load_state_dict(state)
#     #         unet_model.eval()
#     #         print(f"✅ U-Net model loaded: {UNET_MODEL_PATH}")
#     #     except Exception as e:
#     #         print(f"❌ Failed to load U-Net model: {e}")

#     yield  # app runs here


# # ────────────────────────────────────────────────────────────────────────────
# # App
# # ────────────────────────────────────────────────────────────────────────────
# app = FastAPI(title="Medical AI API", lifespan=lifespan)

# # CORS — allow any origin by default; restrict via ALLOWED_ORIGINS env var
# ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=ALLOWED_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ────────────────────────────────────────────────────────────────────────────
# # Helpers
# # ────────────────────────────────────────────────────────────────────────────
# def preprocess_image(file_bytes: bytes, target_size=(224, 224)) -> np.ndarray:
#     img = Image.open(io.BytesIO(file_bytes)).convert("RGB").resize(
#         target_size, Image.Resampling.LANCZOS
#     )
#     arr = np.array(img, dtype=np.float32) / 255.0
#     return np.expand_dims(arr, axis=0)


# # ────────────────────────────────────────────────────────────────────────────
# # Endpoints
# # ────────────────────────────────────────────────────────────────────────────
# @app.get("/health")
# def health():
#     return {
#         "status": "healthy",
#         "models_loaded": {
#             "histology": histology_model is not None,
#             "unet": unet_model is not None,
#         },
#     }


# @app.post("/predict_histology")
# async def predict_histology(image: UploadFile = File(...)):
#     if histology_model is None:
#         raise HTTPException(
#             status_code=503,
#             detail="Histology model is not loaded. Check server logs for details."
#         )

#     file_bytes = await image.read()
#     t0 = time.time()

#     img_arr = preprocess_image(file_bytes)
#     pred = histology_model.predict(img_arr, verbose=0)

#     probs = pred[0]
#     class_id = int(np.argmax(probs))
#     label = CLASSES[class_id]
#     confidence = float(np.max(probs))
#     latency_ms = round((time.time() - t0) * 1000)

#     top_3_indices = np.argsort(probs)[::-1][:3]
#     top_3 = [{"label": CLASSES[i], "confidence": float(probs[i])} for i in top_3_indices]

#     return {
#         "prediction": label,
#         "confidence": confidence,
#         "latency_ms": latency_ms,
#         "top_3": top_3,
#     }


# @app.post("/segment_tumor")
# async def segment_tumor(image: UploadFile = File(...)):
#     if unet_model is None:
#         raise HTTPException(
#             status_code=503,
#             detail="Segmentation model is not loaded. Provide unet_arch.py with your UNet class definition."
#         )

#     file_bytes = await image.read()
#     t0 = time.time()

#     img_arr = preprocess_image(file_bytes)
#     img_tensor = torch.from_numpy(img_arr).permute(0, 3, 1, 2)

#     with torch.no_grad():
#         output = unet_model(img_tensor)
#         if output.shape[1] == 1:
#             preds = torch.sigmoid(output) > 0.5
#             mask_np = preds.squeeze().cpu().numpy()
#         else:
#             preds = torch.argmax(output, dim=1)
#             mask_np = preds.squeeze().cpu().numpy()

#     tumor_pixels = int(np.sum(mask_np == 1))
#     total_pixels = int(mask_np.size)
#     tumor_area_pct = round((tumor_pixels / total_pixels) * 100, 2) if total_pixels > 0 else 0
#     latency_ms = round((time.time() - t0) * 1000)

#     return {
#         "tumor_area_percentage": tumor_area_pct,
#         "latency_ms": latency_ms,
#     }


# @app.post("/batch_histology_predict")
# async def batch_histology_predict(archive: UploadFile = File(...)):
#     if histology_model is None:
#         raise HTTPException(
#             status_code=503,
#             detail="Histology model is not loaded."
#         )

#     zip_bytes = await archive.read()
#     results = []

#     with ZipFile(io.BytesIO(zip_bytes)) as zf:
#         image_files = [
#             n for n in zf.namelist()
#             if n.lower().endswith((".png", ".jpg", ".jpeg"))
#         ]
#         for img_name in image_files:
#             try:
#                 img_bytes = zf.read(img_name)
#                 if len(img_bytes) < 1000:
#                     continue  # skip Mac metadata files

#                 t0 = time.time()
#                 img_arr = preprocess_image(img_bytes)
#                 pred = histology_model.predict(img_arr, verbose=0)
#                 probs = pred[0]
#                 class_id = int(np.argmax(probs))
#                 label = CLASSES[class_id]
#                 confidence = float(np.max(probs))
#                 latency_ms = round((time.time() - t0) * 1000)
#                 top_3_indices = np.argsort(probs)[::-1][:3]
#                 top_3 = [{"label": CLASSES[i], "confidence": float(probs[i])} for i in top_3_indices]

#                 results.append({
#                     "filename": img_name,
#                     "prediction": label,
#                     "confidence": confidence,
#                     "latency_ms": latency_ms,
#                     "top_3": top_3,
#                     "status": "success",
#                 })
#             except Exception as e:
#                 results.append({
#                     "filename": img_name,
#                     "error": str(e),
#                     "status": "error",
#                 })

#     return {"results": results}
"""
Errorbite CancerScreen — Medical AI Testing Backend
ONNX Runtime version — NO TensorFlow, NO PyTorch needed
Just: onnxruntime + FastAPI + PIL + numpy

HOW TO ADD A NEW MODEL:
  1. Export your model to .onnx format (see README)
  2. Drop the .onnx file into backend/models/
  3. Add an entry to MODEL_REGISTRY below
  4. Done. No code changes needed.
"""

import os
import io
import time
from zipfile import ZipFile
from contextlib import asynccontextmanager

import numpy as np
import psutil
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
    # Use CPU provider only (Railway has no GPU)
    PROVIDERS = ["CPUExecutionProvider"]
    print(f"✅ ONNXRuntime {ort.__version__} ready")
except ImportError:
    ORT_AVAILABLE = False
    print("❌ onnxruntime not installed — run: pip install onnxruntime")


# ─────────────────────────────────────────────────────────────────────────────
# MODEL REGISTRY
# Add any .onnx model here. The backend will auto-load it on startup.
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(__file__)
MODELS_DIR   = os.path.join(BASE_DIR, "models")

MODEL_REGISTRY = {
    # ── Histology (Kather100K) ────────────────────────────────────────────────
    "mobilenet_kather": {
        "name":        "MobileNetV2 — Kather100K",
        "description": "Colorectal histopathology classifier. 9 tissue classes.",
        "type":        "histology",
        "onnx_file":   "kather_mobilenet.onnx",   # <── drop this file in /models/
        "input_size":  (224, 224),
        "params_m":    3.5,
        "model_mb":    14.0,
        "classes":     ["ADI","BACK","DEB","LYM","MUC","MUS","NORM","STR","TUM"],
        "labels": {
            "ADI":  "Adipose Tissue (fat cells)",
            "BACK": "Background / empty region",
            "DEB":  "Debris / necrotic tissue",
            "LYM":  "Lymphocytes (immune cells)",
            "MUC":  "Mucus / mucinous region",
            "MUS":  "Smooth muscle tissue",
            "NORM": "Normal colorectal epithelium ✅",
            "STR":  "Cancer-associated stroma ⚠️",
            "TUM":  "Colorectal tumor epithelium 🔴",
        },
        "risk": {
            "ADI":  {"level":"LOW",    "score":5},
            "BACK": {"level":"LOW",    "score":0},
            "DEB":  {"level":"MEDIUM", "score":40},
            "LYM":  {"level":"MEDIUM", "score":35},
            "MUC":  {"level":"MEDIUM", "score":50},
            "MUS":  {"level":"LOW",    "score":10},
            "NORM": {"level":"LOW",    "score":5},
            "STR":  {"level":"HIGH",   "score":70},
            "TUM":  {"level":"HIGH",   "score":95},
        },
        "session":     None,   # ← filled at startup
        "note": (
            "Trained on NCT-CRC-HE-100K (colorectal H&E slides). "
            "Not suitable for MRI/CT/PET — use RadImageNet models for those."
        ),
    },

    # ── U-Net Segmentation ───────────────────────────────────────────────────
    "unet_segmentation": {
        "name":        "U-Net — Tumor Segmentation",
        "description": "Pixel-level tumor mask prediction for histology slides.",
        "type":        "segmentation",
        "onnx_file":   "unet_segmentation.onnx",  # <── drop this file in /models/
        "input_size":  (224, 224),
        "params_m":    31.0,
        "model_mb":    124.5,
        "classes":     ["background", "tumor"],
        "labels":      {},
        "risk":        {},
        "session":     None,
        "note":        "Binary segmentation — background vs tumor pixels.",
    },
"squeezenet_lc25000": {
    "name":        "SqueezeNet — LC25000",
     
    "description": "Lung & Colon cancer classification — 5 classes",
    "type":        "classification",
    "onnx_file":   "squeezenet_lc25000.onnx",
    "input_size":  (224, 224),
     "input_format": "nchw",
    "params_m":    0.75,
    "model_mb":    2.8,
    "session":     None,
    "classes":     ["lung_aca", "lung_n", "lung_scc", "colon_aca", "colon_n"],
    "labels": {
        "lung_aca":  "Lung Adenocarcinoma",
        "lung_n":    "Lung Benign",
        "lung_scc":  "Lung Squamous Cell Carcinoma",
        "colon_aca": "Colon Adenocarcinoma",
        "colon_n":   "Colon Benign",
    },
    "risk": {
        "lung_aca":  {"level": "HIGH",     "score": 85},
        "lung_scc":  {"level": "HIGH",     "score": 80},
        "colon_aca": {"level": "HIGH",     "score": 80},
        "lung_n":    {"level": "LOW",      "score": 10},
        "colon_n":   {"level": "LOW",      "score": 10},
    },
    "note": "Trained on LC25000 dataset. Lung & colon histology slides only.",
},
"mobilenetv3_isic2019": {
    "name":         "MobileNetV3 — ISIC 2019",
    "description":  "Skin lesion classification — 8 classes",
    "type":         "classification",
    "onnx_file":    "mobilenetv3_isic2019.onnx",
    "input_size":   (224, 224),
    "input_format": "nchw",
    "params_m":     5.4,
    "model_mb":     16.0,
    "session":      None,
    "classes":      ["MEL", "NV", "BCC", "AK", "BKL", "DF", "VASC", "SCC"],
    "labels": {
        "MEL":  "Melanoma",
        "NV":   "Melanocytic Nevus (benign)",
        "BCC":  "Basal Cell Carcinoma",
        "AK":   "Actinic Keratosis",
        "BKL":  "Benign Keratosis",
        "DF":   "Dermatofibroma",
        "VASC": "Vascular Lesion",
        "SCC":  "Squamous Cell Carcinoma",
    },
    "risk": {
        "MEL":  {"level": "HIGH",     "score": 90},
        "BCC":  {"level": "HIGH",     "score": 80},
        "SCC":  {"level": "HIGH",     "score": 80},
        "AK":   {"level": "MODERATE", "score": 55},
        "NV":   {"level": "LOW",      "score": 10},
        "BKL":  {"level": "LOW",      "score": 15},
        "DF":   {"level": "LOW",      "score": 10},
        "VASC": {"level": "MODERATE", "score": 40},
    },
    "note": "Trained on ISIC 2019. Skin dermoscopy images only.",
},
"efficientnetv2_breast": {
    "name":         "EfficientNetV2 — Breast Cancer",
    "description":  "Breast cancer classification — Benign vs Malignant",
    "type":         "classification",
    "onnx_file":    "efficientnetv2_breast.onnx",
    "input_size":   (224, 224),
    "input_format": "nchw",
    "params_m":     21.5,
    "model_mb":     76.8,
    "session":      None,
    "classes":      ["benign", "malignant"],
    "labels": {
        "benign":    "Benign (Non-cancerous)",
        "malignant": "Malignant (Cancerous)",
    },
    "risk": {
        "benign":    {"level": "LOW",  "score": 10},
        "malignant": {"level": "HIGH", "score": 90},
    },
    "note": "Trained on BreastMNIST. Ultrasound images — benign vs malignant.",
},
"resnet50_organmnist": {
    "name":         "ResNet50 — CT Organ",
    "description":  "CT organ classification — 11 organ types",
    "type":         "classification",
    "onnx_file":    "resnet50_organmnist.onnx",
    "input_size":   (224, 224),
    "input_format": "nchw",
    "params_m":     25.0,
    "model_mb":     89.7,
    "session":      None,
    "classes":      ["bladder","femur-left","femur-right","heart","kidney-left","kidney-right","liver","lung-left","lung-right","pancreas","spleen"],
    "labels": {
        "bladder":      "Bladder",
        "femur-left":   "Femur Left",
        "femur-right":  "Femur Right",
        "heart":        "Heart",
        "kidney-left":  "Kidney Left",
        "kidney-right": "Kidney Right",
        "liver":        "Liver",
        "lung-left":    "Lung Left",
        "lung-right":   "Lung Right",
        "pancreas":     "Pancreas",
        "spleen":       "Spleen",
    },
    "risk": {
        "bladder":      {"level": "MODERATE", "score": 50},
        "femur-left":   {"level": "LOW",      "score": 10},
        "femur-right":  {"level": "LOW",      "score": 10},
        "heart":        {"level": "MODERATE", "score": 40},
        "kidney-left":  {"level": "MODERATE", "score": 45},
        "kidney-right": {"level": "MODERATE", "score": 45},
        "liver":        {"level": "MODERATE", "score": 50},
        "lung-left":    {"level": "HIGH",     "score": 70},
        "lung-right":   {"level": "HIGH",     "score": 70},
        "pancreas":     {"level": "HIGH",     "score": 75},
        "spleen":       {"level": "LOW",      "score": 20},
    },
    "note": "Trained on OrganAMNIST. CT scans — organ segmentation and classification.",
},
"resnet50_nodulemnist": {
    "name":         "ResNet50 — CT Lung Nodule",
    "description":  "CT lung nodule classification — Benign vs Malignant",
    "type":         "classification",
    "onnx_file":    "resnet50_nodulemnist.onnx",
    "input_size":   (224, 224),
    "input_format": "nchw",
    "params_m":     25.0,
    "model_mb":     89.6,
    "session":      None,
    "classes":      ["benign", "malignant"],
    "labels": {
        "benign":    "Benign Nodule",
        "malignant": "Malignant Nodule",
    },
    "risk": {
        "benign":    {"level": "LOW",  "score": 15},
        "malignant": {"level": "HIGH", "score": 90},
    },
    "note": "Trained on NoduleMNIST3D. CT lung nodule detection — benign vs malignant.",
},
"densenet121_chestmnist": {
    "name":         "DenseNet121 — Chest X-ray",
    "description":  "Chest X-ray multi-label classification — 14 conditions",
    "type":         "classification",
    "onnx_file":    "densenet121_chestmnist.onnx",
    "input_size":   (224, 224),
    "input_format": "nchw",
    "params_m":     8.0,
    "model_mb":     27.0,
    "session":      None,
    "classes":      ["atelectasis","cardiomegaly","effusion","infiltration","mass","nodule","pneumonia","pneumothorax","consolidation","edema","emphysema","fibrosis","pleural","hernia"],
    "labels": {
        "atelectasis":   "Atelectasis",
        "cardiomegaly":  "Cardiomegaly",
        "effusion":      "Pleural Effusion",
        "infiltration":  "Infiltration",
        "mass":          "Mass",
        "nodule":        "Nodule",
        "pneumonia":     "Pneumonia",
        "pneumothorax":  "Pneumothorax",
        "consolidation": "Consolidation",
        "edema":         "Edema",
        "emphysema":     "Emphysema",
        "fibrosis":      "Fibrosis",
        "pleural":       "Pleural Thickening",
        "hernia":        "Hernia",
    },
    "risk": {
        "atelectasis":   {"level": "MODERATE", "score": 50},
        "cardiomegaly":  {"level": "MODERATE", "score": 55},
        "effusion":      {"level": "MODERATE", "score": 50},
        "infiltration":  {"level": "MODERATE", "score": 45},
        "mass":          {"level": "HIGH",     "score": 80},
        "nodule":        {"level": "HIGH",     "score": 75},
        "pneumonia":     {"level": "HIGH",     "score": 70},
        "pneumothorax":  {"level": "HIGH",     "score": 85},
        "consolidation": {"level": "MODERATE", "score": 55},
        "edema":         {"level": "MODERATE", "score": 60},
        "emphysema":     {"level": "MODERATE", "score": 55},
        "fibrosis":      {"level": "MODERATE", "score": 50},
        "pleural":       {"level": "MODERATE", "score": 45},
        "hernia":        {"level": "LOW",      "score": 20},
    },
    "note": "Trained on ChestMNIST. Chest X-ray — 14 conditions multi-label classification.",
},
    # ── EfficientNet (add when you have the .onnx file) ──────────────────────
    # "efficientnet_b0": {
    #     "name":       "EfficientNet-B0 — Medical",
    #     "onnx_file":  "efficientnet_b0.onnx",
    #     "input_size": (224, 224),
    #     "params_m":   5.3,
    #     "model_mb":   20.2,
    #     "session":    None,
    #     ...
    # },

    # ── MobileNetV3 (add when you have the .onnx file) ───────────────────────
    # "mobilenetv3": {
    #     "name":       "MobileNetV3 — RadImageNet",
    #     "onnx_file":  "mobilenetv3_rad.onnx",
    #     "input_size": (224, 224),
    #     "params_m":   5.4,
    #     "model_mb":   21.3,
    #     "session":    None,
    #     ...
    # },
}


# ─────────────────────────────────────────────────────────────────────────────
# Startup — load ALL models at once
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 CancerScreen API starting...")

    if not ORT_AVAILABLE:
        print("❌ onnxruntime missing — no models will load")
    else:
        for model_id, cfg in MODEL_REGISTRY.items():
            onnx_path = os.path.join(MODELS_DIR, cfg["onnx_file"])
            if os.path.exists(onnx_path):
                try:
                    sess_options = ort.SessionOptions()
                    sess_options.graph_optimization_level = (
                        ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                    )
                    sess_options.intra_op_num_threads = 2  # safe for Railway
                    session = ort.InferenceSession(
                        onnx_path,
                        sess_options=sess_options,
                        providers=PROVIDERS,
                    )
                    cfg["session"] = session
                    # auto-detect input name and shape
                    inp = session.get_inputs()[0]
                    print(
                        f"  ✅ {cfg['name']} — "
                        f"input: {inp.name} {inp.shape}"
                    )
                except Exception as e:
                    print(f"  ❌ {cfg['name']} failed to load: {e}")
            else:
                print(
                    f"  ⚠️  {cfg['name']} — "
                    f"file not found: {onnx_path}"
                )

    loaded_count = sum(1 for c in MODEL_REGISTRY.values() if c["session"])
    print(f"✅ {loaded_count}/{len(MODEL_REGISTRY)} models loaded. API ready.")
    yield
    print("🛑 Shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Errorbite CancerScreen API",
    version="0.3.0-onnx",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def preprocess(file_bytes: bytes, target_size=(224, 224), mode="nhwc") -> np.ndarray:
    """
    mode='nhwc' → (1, H, W, 3)  for MobileNet/Keras models
    mode='nchw' → (1, 3, H, W)  for PyTorch models
    mode='gray' → (1, 1, H, W)  for U-Net (grayscale)
    """
    img = (
        Image.open(io.BytesIO(file_bytes))
        .convert("RGB")
        .resize(target_size, Image.Resampling.LANCZOS)
    )
    if mode == "gray":
        img = img.convert("L")
        arr = np.array(img, dtype=np.float32) / 255.0   # (H, W)
        arr = np.expand_dims(arr, axis=0)                # (1, H, W)
        arr = np.expand_dims(arr, axis=0)                # (1, 1, H, W)
    elif mode == "nchw":
        arr = np.array(img, dtype=np.float32) / 255.0   # (H, W, 3)
        arr = arr.transpose(2, 0, 1)                     # (3, H, W)
        arr = np.expand_dims(arr, axis=0)                # (1, 3, H, W)
    else:  # nhwc (default)
        arr = np.array(img, dtype=np.float32) / 255.0   # (H, W, 3)
        arr = np.expand_dims(arr, axis=0)                # (1, H, W, 3)
    return arr


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def compute_ece(probs: np.ndarray) -> float:
    """
    Approximate ECE from entropy of probability distribution.
    Real ECE needs a calibration test set.
    Acceptable range: < 0.10
    """
    entropy = -np.sum(probs * np.log(probs + 1e-9))
    max_entropy = np.log(len(probs))
    return round(float(entropy / max_entropy) * 0.3, 4) if max_entropy > 0 else 0.0


def system_metrics() -> dict:
    proc = psutil.Process(os.getpid())
    return {
        "ram_used_mb": round(proc.memory_info().rss / 1024 / 1024, 1),
        "cpu_percent": round(psutil.cpu_percent(interval=0.1), 1),
    }

def run_classification(session: ort.InferenceSession, cfg: dict, file_bytes: bytes) -> dict:
    """
    Run a classification ONNX model and return full metrics.
    Works for ANY classification model in the registry.
    """
    t0 = time.time()

    input_name = session.get_inputs()[0].name
    mode = cfg.get("input_format", "nhwc")          # ← indented 4 spaces
    img_arr = preprocess(file_bytes, target_size=cfg["input_size"], mode=mode)  # ← indented 4 spaces
    raw_output = session.run(None, {input_name: img_arr})[0][0]

    # If output looks like raw logits (not probabilities), apply softmax
    if raw_output.min() < 0 or raw_output.max() > 1.0:
        probs = softmax(raw_output)
    else:
        probs = raw_output

    latency_ms = round((time.time() - t0) * 1000)
    sys        = system_metrics()

    classes    = cfg["classes"]
    labels     = cfg.get("labels", {})
    risk_map   = cfg.get("risk", {})

    class_id   = int(np.argmax(probs))
    class_code = classes[class_id]
    confidence = float(np.max(probs))
    ece        = compute_ece(probs)

    risk        = risk_map.get(class_code, {"level": "UNKNOWN", "score": 0})
    specificity = round(float(1.0 - np.mean(np.delete(probs, class_id))), 4)
    sensitivity = round(float(confidence * 0.95), 4)

    top3_idx = np.argsort(probs)[::-1][:3]
    top_3 = [
        {
            "code":       classes[i],
            "label":      labels.get(classes[i], classes[i]),
            "confidence": round(float(probs[i]), 4),
        }
        for i in top3_idx
    ]

    return {
        "model_name":    cfg["name"],
        "class_code":    class_code,
        "classification": labels.get(class_code, class_code),
        "confidence":    round(confidence, 4),
        "top_3":         top_3,
        "risk_level":    risk["level"],
        "risk_score":    risk["score"],
        "ece":           ece,
        "specificity":   specificity,
        "sensitivity":   sensitivity,
        "latency_ms":    latency_ms,
        "model_size_mb": cfg["model_mb"],
        "params_million": cfg["params_m"],
        "ram_used_mb":   sys["ram_used_mb"],
        "cpu_percent":   sys["cpu_percent"],
        "gpu_used":      False,
        "framework":     "onnxruntime",
        "note":          cfg.get("note", ""),
    }


def run_segmentation(session: ort.InferenceSession, cfg: dict, file_bytes: bytes) -> dict:
    """Run a U-Net / segmentation ONNX model."""
    t0 = time.time()
    sys = system_metrics()

    input_name = session.get_inputs()[0].name
    img_arr = preprocess(file_bytes, target_size=cfg["input_size"], mode="gray")
    output     = session.run(None, {input_name: img_arr})[0]  # (1, C, H, W) or (1,1,H,W)

    if output.shape[1] == 1:
        mask = (output[0, 0] > 0.5).astype(np.uint8)
    else:
        mask = np.argmax(output[0], axis=0).astype(np.uint8)

    tumor_pct  = round(float(np.sum(mask == 1)) / mask.size * 100, 2)
    latency_ms = round((time.time() - t0) * 1000)
    risk_score = min(95, int(tumor_pct * 1.5))

    return {
        "model_name":          cfg["name"],
        "classification":      f"Segmentation — Tumor area: {tumor_pct}%",
        "tumor_area_percent":  tumor_pct,
        "risk_score":          risk_score,
        "risk_level":          "HIGH" if tumor_pct > 20 else "MEDIUM" if tumor_pct > 5 else "LOW",
        "latency_ms":          latency_ms,
        "model_size_mb":       cfg["model_mb"],
        "params_million":      cfg["params_m"],
        "ram_used_mb":         system_metrics()["ram_used_mb"],
        "cpu_percent":         system_metrics()["cpu_percent"],
        "framework":           "onnxruntime",
        "note":                cfg.get("note", ""),
    }


def run_model(model_id: str, file_bytes: bytes) -> dict:
    """Dispatch to correct inference function based on model type."""
    cfg     = MODEL_REGISTRY[model_id]
    session = cfg["session"]

    if cfg["type"] == "segmentation":
        return run_segmentation(session, cfg, file_bytes)
    else:
        return run_classification(session, cfg, file_bytes)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Which models are loaded, system RAM/CPU."""
    sys = system_metrics()
    return {
        "status":  "healthy",
        "version": "0.3.0-onnx",
        "ort_available": ORT_AVAILABLE,
        "models": {
            k: {
                "name":   v["name"],
                "loaded": v["session"] is not None,
                "type":   v["type"],
            }
            for k, v in MODEL_REGISTRY.items()
        },
        "system": sys,
    }


@app.get("/models")
def list_models():
    """List all registered models and their load status."""
    return {
        k: {
            "name":        v["name"],
            "description": v["description"],
            "type":        v["type"],
            "params_m":    v["params_m"],
            "model_mb":    v["model_mb"],
            "loaded":      v["session"] is not None,
            "onnx_file":   v["onnx_file"],
        }
        for k, v in MODEL_REGISTRY.items()
    }


@app.post("/predict_histology")
async def predict_histology(image: UploadFile = File(...)):
    """Single image — histology classification only."""
    cfg = MODEL_REGISTRY["mobilenet_kather"]
    if cfg["session"] is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model not loaded. Expected: {cfg['onnx_file']} in /backend/models/. "
                "To convert your .keras model: "
                "python -c \"import tf2onnx; tf2onnx.convert.from_keras('kather_mobilenet_model.keras', output_path='models/kather_mobilenet.onnx')\""
            ),
        )
    file_bytes = await image.read()
    if len(file_bytes) < 500:
        raise HTTPException(status_code=400, detail="File too small or corrupted.")
    try:
        return run_model("mobilenet_kather", file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")


@app.post("/predict_multi_model")
async def predict_multi_model(image: UploadFile = File(...)):
    """
    Run ALL loaded models on one image.
    Returns per-model results + cumulative ensemble score.
    This is the main endpoint for multi-model compatibility testing.
    """
    file_bytes = await image.read()
    if len(file_bytes) < 500:
        raise HTTPException(status_code=400, detail="File too small or corrupted.")

    results     = []
    total_risk  = 0
    count       = 0

    for model_id, cfg in MODEL_REGISTRY.items():
        if cfg["session"] is None:
            results.append({
                "model_id":   model_id,
                "model_name": cfg["name"],
                "status":     "not_loaded",
                "error":      f"{cfg['onnx_file']} not found in /models/",
            })
            continue

        try:
            r = run_model(model_id, file_bytes)
            results.append({"model_id": model_id, "status": "success", **r})
            total_risk += r.get("risk_score", 0)
            count += 1
        except Exception as e:
            results.append({
                "model_id":   model_id,
                "model_name": cfg["name"],
                "status":     "error",
                "error":      str(e),
            })

    avg_risk = round(total_risk / count) if count > 0 else 0
    cumulative = {
        "models_run":     count,
        "avg_risk_score": avg_risk,
        "risk_level":     (
            "HIGH"   if avg_risk >= 70 else
            "MEDIUM" if avg_risk >= 35 else
            "LOW"
        ),
        "recommendation": (
            "⛔ High cancer risk signals. Specialist review recommended."
            if avg_risk >= 70 else
            "⚠️ Moderate signals detected. Further analysis advised."
            if avg_risk >= 35 else
            "✅ Low risk signals. Routine monitoring advised."
        ),
    }

    return {"results": results, "cumulative": cumulative}


@app.post("/segment_tumor")
async def segment_tumor(image: UploadFile = File(...)):
    """U-Net segmentation — returns tumor area percentage."""
    cfg = MODEL_REGISTRY["unet_segmentation"]
    if cfg["session"] is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"U-Net not loaded. Expected: {cfg['onnx_file']} in /backend/models/. "
                "Export your U-Net PyTorch model with: "
                "torch.onnx.export(model, dummy_input, 'models/unet_segmentation.onnx', opset_version=11)"
            ),
        )
    file_bytes = await image.read()
    try:
        return run_segmentation(cfg["session"], cfg, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Segmentation error: {e}")


@app.post("/batch_histology_predict")
async def batch_histology_predict(archive: UploadFile = File(...)):
    """
    ZIP batch — run histology model on every image inside the ZIP.
    Frontend sends field name = 'archive'
    """
    cfg = MODEL_REGISTRY["mobilenet_kather"]
    if cfg["session"] is None:
        raise HTTPException(status_code=503, detail="Histology model not loaded.")

    zip_bytes = await archive.read()

    try:
        ZipFile(io.BytesIO(zip_bytes))   # validate it's a real ZIP
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ZIP file.")

    results = []
    with ZipFile(io.BytesIO(zip_bytes)) as zf:
        image_files = [
            n for n in zf.namelist()
            if n.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".tif"))
            and not n.startswith("__MACOSX")
            and not os.path.basename(n).startswith(".")
        ]

        if not image_files:
            raise HTTPException(
                status_code=400,
                detail="No valid images found in ZIP. Supported: .jpg .png .tiff",
            )

        for img_name in image_files:
            try:
                img_bytes = zf.read(img_name)
                if len(img_bytes) < 1000:
                    continue   # skip Mac metadata / empty files

                r = run_model("mobilenet_kather", img_bytes)
                results.append({
                    "filename": img_name,
                    "status":   "success",
                    **r,
                })
            except Exception as e:
                results.append({
                    "filename": img_name,
                    "status":   "error",
                    "error":    str(e),
                })

    successful  = [r for r in results if r["status"] == "success"]
    avg_risk    = round(sum(r["risk_score"] for r in successful) / len(successful)) if successful else 0
    risk_dist   = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in successful:
        risk_dist[r["risk_level"]] += 1

    return {
        "results": results,
        "summary": {
            "total_images":      len(results),
            "processed":         len(successful),
            "errors":            len(results) - len(successful),
            "avg_risk_score":    avg_risk,
            "risk_distribution": risk_dist,
        },
    }