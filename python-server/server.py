from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
from zipfile import ZipFile
import io, time, os, concurrent.futures, random

app = Flask(__name__)
CORS(app)

# Mock model registry (simulating pretrained models without actually loading TensorFlow)
MODEL_REGISTRY = {
    'ResNet50':       {'size': (224, 224)},
    'MobileNetV2':    {'size': (224, 224)},
    'InceptionV3':    {'size': (299, 299)},
    'EfficientNetB0': {'size': (224, 224)},
    'ShuffleNetV2':   {'size': (224, 224)},
}

# Model specifications for specs table (hardcoded)
MODEL_SPECS = {
    'ResNet50': {
        'params': '25.6M',
        'latency_avg': 450,
        'accuracy': 0.92,
        'calibration_error': 0.18,
        'memory': '98MB',
        'type': 'Robust',
    },
    'MobileNetV2': {
        'params': '3.5M',
        'latency_avg': 120,
        'accuracy': 0.88,
        'calibration_error': 0.12,
        'memory': '14MB',
        'type': 'Efficient',
    },
    'InceptionV3': {
        'params': '27.2M',
        'latency_avg': 380,
        'accuracy': 0.91,
        'calibration_error': 0.15,
        'memory': '109MB',
        'type': 'Balanced',
    },
    'EfficientNetB0': {
        'params': '5.3M',
        'latency_avg': 200,
        'accuracy': 0.90,
        'calibration_error': 0.10,
        'memory': '29MB',
        'type': 'Balanced',
    },
    'ShuffleNetV2': {
        'params': '2.3M',
        'latency_avg': 90,
        'accuracy': 0.86,
        'calibration_error': 0.14,
        'memory': '9MB',
        'type': 'Lightweight',
    },
}

# Common medical image labels for demo
DEMO_LABELS = [
    'Normal',
    'Pneumonia',
    'COVID-19',
    'Tuberculosis',
    'Nodule',
    'Fracture',
    'Tumor',
    'Inflammation',
    'Fluid Accumulation',
    'Calcification',
]

def preprocess_medical_image(image_bytes, target_size):
    """
    Preprocessing for medical images (CT, histopathology, X-Ray, MRI).
    - Converts to RGB (handles grayscale DICOM-like PNGs)
    - Resizes to target_size
    - Safely handles PIL Image loading
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        
        # Handle grayscale / RGBA / other modes → RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # High-quality resize with safe PIL method
        img = img.resize(target_size, Image.Resampling.LANCZOS)
        
        arr = np.array(img, dtype=np.float32)
        
        # Normalise intensity range to [0, 255] (important for CT scans with HU values)
        if arr.max() > 255 or arr.min() < 0:
            arr = arr - arr.min()
            if arr.max() > 0:
                arr = arr / arr.max() * 255.0
        
        arr = np.expand_dims(arr, axis=0)   # add batch dim
        return arr
    except Exception as e:
        print(f"❌ Preprocess error: {str(e)}")
        raise

def run_single_model(model_name, image_bytes):
    """Simulate model inference with deterministic but varied results."""
    try:
        cfg = MODEL_REGISTRY[model_name]
        t0 = time.time()
        
        # Simulate preprocessing
        arr = preprocess_medical_image(image_bytes, cfg['size'])
        
        # Simulate inference time (based on model specs)
        specs = MODEL_SPECS.get(model_name, {})
        latency_ms = specs.get('latency_avg', 200) + random.randint(-30, 50)
        time.sleep(latency_ms / 1000.0)
        
        # Generate mock prediction
        label = random.choice(DEMO_LABELS)
        confidence = random.uniform(0.65, 0.99)
        
        return {
            'model': model_name,
            'output': label,
            'confidence': round(float(confidence), 4),
            'latency': latency_ms,
            'calibration_error': specs.get('calibration_error', 0.15),
            'accuracy': specs.get('accuracy', 0.85),
        }
    except Exception as e:
        return {'model': model_name, 'output': 'Error', 'confidence': 0.0, 'latency': 0, 'error': str(e)}

def cumulative_prediction(results):
    """Majority vote + average confidence across successful models + risk score."""
    valid = [r for r in results if r.get('output') != 'Error']
    if not valid:
        return {'label': 'Unknown', 'avg_confidence': 0.0, 'risk_score': 5.0, 'risk_level': 'High'}
    # Majority vote
    from collections import Counter
    votes = Counter(r['output'] for r in valid)
    winner = votes.most_common(1)[0][0]
    winner_results = [r for r in valid if r['output'] == winner]
    avg_conf = round(sum(r['confidence'] for r in winner_results) / len(winner_results), 4)
    
    # Calculate cumulative risk score (0-5 scale)
    # Score breakdown:
    # - Accuracy component: (1 - avg_confidence) * 2  [0-2]
    # - Calibration component: avg(calibration_error) * 5 [0-5, normalized to 0-2]
    # - Latency component: normalized latency [0-1]
    
    avg_accuracy = sum(r['confidence'] for r in winner_results) / len(winner_results)
    avg_ce = sum(r.get('calibration_error', 0.15) for r in winner_results) / len(winner_results)
    avg_latency = sum(r.get('latency', 0) for r in winner_results) / len(winner_results)
    
    # Normalize components to 0-5
    accuracy_component = (1 - avg_accuracy) * 2  # 0-2
    calibration_component = min(avg_ce * 5, 2)   # 0-2 (normalized from 0-1 CE)
    latency_component = min(avg_latency / 500, 1) # 0-1 (assume 500ms is max acceptable)
    
    risk_score = round(accuracy_component + calibration_component + latency_component, 2)
    
    # Classification: Low (0-1.5), Medium (1.5-3.5), High (3.5-5)
    if risk_score < 1.5:
        risk_level = 'Low'
    elif risk_score < 3.5:
        risk_level = 'Medium'
    else:
        risk_level = 'High'
    
    return {
        'label': winner,
        'avg_confidence': avg_conf,
        'vote_count': votes[winner],
        'total_models': len(valid),
        'risk_score': risk_score,
        'risk_level': risk_level,
        'avg_calibration_error': round(avg_ce, 4),
    }

@app.route('/model-specs', methods=['GET'])
def model_specs():
    """Return specifications for all available models."""
    specs_list = []
    for model_name, specs in MODEL_SPECS.items():
        specs_list.append({
            'name': model_name,
            'type': specs.get('type', 'General'),
            'params': specs.get('params', 'N/A'),
            'memory': specs.get('memory', 'N/A'),
            'latency_avg': specs.get('latency_avg', 0),
            'accuracy': specs.get('accuracy', 0),
            'calibration_error': specs.get('calibration_error', 0),
        })
    return jsonify({'specs': specs_list})

@app.route('/predict', methods=['POST'])
@app.route('/predict_multi', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file uploaded'}), 400
        
        file = request.files['image']
        filename = file.filename or 'unknown.jpg'
        
        # DEBUG: Log file info
        file_bytes = file.read()
        print(f"📸 File: {filename}, Size: {len(file_bytes)} bytes")
        
        if len(file_bytes) < 1000:
            return jsonify({'error': f'File too small: {len(file_bytes)} bytes'}), 400
        
        # Get models before image processing
        raw_models = request.form.get('models', 'MobileNetV2')
        model_names = [m.strip() for m in raw_models.split(',') if m.strip() in MODEL_REGISTRY]
        
        if not model_names:
            return jsonify({'error': 'No valid models specified'}), 400
        
        # RESET file pointer and load image SAFELY
        try:
            image = Image.open(io.BytesIO(file_bytes)).convert('RGB')
            image = image.resize((224, 224), Image.Resampling.LANCZOS)
            
            # Convert to numpy array for model
            img_array = np.array(image, dtype=np.float32) / 255.0
            img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
            
            print(f"✅ Image processed: {img_array.shape}")
        except Exception as img_err:
            print(f"❌ Image processing error: {str(img_err)}")
            return jsonify({'error': f'Image processing failed: {str(img_err)}'}), 400
        
        # Run all models in parallel
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            futures = {ex.submit(run_single_model, name, file_bytes): name for name in model_names}
            for fut in concurrent.futures.as_completed(futures):
                results.append(fut.result())

        # Sort results in the requested order
        order = {m: i for i, m in enumerate(model_names)}
        results.sort(key=lambda r: order.get(r['model'], 99))

        cumulative = cumulative_prediction(results)

        return jsonify({'results': results, 'cumulative': cumulative})
    
    except Exception as e:
        print(f"❌ Predict endpoint error: {str(e)}")
        return jsonify({'error': f'Inference failed: {str(e)}'}), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """Process multiple images from a ZIP file."""
    try:
        if 'archive' not in request.files:
            return jsonify({'error': 'No ZIP file uploaded'}), 400
        
        file = request.files['archive']
        filename = file.filename or 'archive.zip'
        
        if not filename.lower().endswith('.zip'):
            return jsonify({'error': 'Only ZIP files are supported'}), 400
        
        # Get models
        raw_models = request.form.get('models', 'MobileNetV2')
        model_names = [m.strip() for m in raw_models.split(',') if m.strip() in MODEL_REGISTRY]
        
        if not model_names:
            return jsonify({'error': 'No valid models specified'}), 400
        
        zip_bytes = file.read()
        results = []
        processed_count = 0
        error_count = 0
        
        print(f"📦 Processing ZIP: {filename}, Size: {len(zip_bytes)} bytes")
        
        try:
            with ZipFile(io.BytesIO(zip_bytes)) as zf:
                image_files = [n for n in zf.namelist() if n.lower().endswith(('.png', '.jpg', '.jpeg'))]
                print(f"📷 Found {len(image_files)} images in ZIP")
                
                for img_name in image_files:
                    try:
                        img_bytes = zf.read(img_name)
                        
                        if len(img_bytes) < 1000:
                            print(f"⚠️  Skipping {img_name} (too small: {len(img_bytes)} bytes)")
                            error_count += 1
                            continue
                        
                        # Process image with all selected models
                        batch_results = []
                        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
                            futures = {ex.submit(run_single_model, name, img_bytes): name for name in model_names}
                            for fut in concurrent.futures.as_completed(futures):
                                batch_results.append(fut.result())
                        
                        # Sort results in the requested order
                        order = {m: i for i, m in enumerate(model_names)}
                        batch_results.sort(key=lambda r: order.get(r['model'], 99))
                        
                        # Calculate cumulative for this image
                        cumulative = cumulative_prediction(batch_results)
                        
                        results.append({
                            'filename': img_name,
                            'results': batch_results,
                            'cumulative': cumulative,
                            'status': 'success'
                        })
                        processed_count += 1
                        print(f"✅ Processed: {img_name} → {cumulative['label']}")
                        
                    except Exception as img_err:
                        print(f"❌ Error processing {img_name}: {str(img_err)}")
                        results.append({
                            'filename': img_name,
                            'status': 'error',
                            'error': str(img_err)
                        })
                        error_count += 1
        
        except Exception as zip_err:
            print(f"❌ ZIP error: {str(zip_err)}")
            return jsonify({'error': f'Failed to unzip: {str(zip_err)}'}), 400
        
        return jsonify({
            'results': results,
            'summary': {
                'total': len(results),
                'processed': processed_count,
                'errors': error_count
            }
        })
    
    except Exception as e:
        print(f"❌ Batch predict error: {str(e)}")
        return jsonify({'error': f'Batch processing failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'available_models': list(MODEL_REGISTRY.keys()),
        'timestamp': time.time()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("Starting Multi-Model Inference Server on port", port)
    print("Available models:", list(MODEL_REGISTRY.keys()))
    app.run(host='0.0.0.0', port=port, debug=False)
