from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.applications import (
    ResNet50, MobileNetV2, InceptionV3, EfficientNetB0
)
from tensorflow.keras.applications.resnet50 import preprocess_input as resnet_preprocess, decode_predictions as resnet_decode
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess, decode_predictions as mobilenet_decode
from tensorflow.keras.applications.inception_v3 import preprocess_input as inception_preprocess, decode_predictions as inception_decode
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess, decode_predictions as efficientnet_decode
from PIL import Image
import numpy as np
import io
import time

app = Flask(__name__)
CORS(app)

# Model configurations
MODELS = {
    'ResNet50': {
        'model': None,
        'preprocess': resnet_preprocess,
        'decode': resnet_decode,
        'input_size': (224, 224)
    },
    'MobileNetV2': {
        'model': None,
        'preprocess': mobilenet_preprocess,
        'decode': mobilenet_decode,
        'input_size': (224, 224)
    },
    'InceptionV3': {
        'model': None,
        'preprocess': inception_preprocess,
        'decode': inception_decode,
        'input_size': (299, 299)
    },
    'EfficientNetB0': {
        'model': None,
        'preprocess': efficientnet_preprocess,
        'decode': efficientnet_decode,
        'input_size': (224, 224)
    }
}

def load_model(model_name):
    """Lazy load models on first use"""
    if MODELS[model_name]['model'] is None:
        print(f"Loading {model_name}...")
        if model_name == 'ResNet50':
            MODELS[model_name]['model'] = ResNet50(weights='imagenet')
        elif model_name == 'MobileNetV2':
            MODELS[model_name]['model'] = MobileNetV2(weights='imagenet')
        elif model_name == 'InceptionV3':
            MODELS[model_name]['model'] = InceptionV3(weights='imagenet')
        elif model_name == 'EfficientNetB0':
            MODELS[model_name]['model'] = EfficientNetB0(weights='imagenet')
        print(f"{model_name} loaded successfully!")
    return MODELS[model_name]['model']

def preprocess_image(image_bytes, model_name):
    """Preprocess image for the selected model"""
    config = MODELS[model_name]
    
    # Load image
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if needed
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize to model's expected input size
    img = img.resize(config['input_size'])
    
    # Convert to array and add batch dimension
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    
    # Apply model-specific preprocessing
    img_array = config['preprocess'](img_array)
    
    return img_array

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get image and model from request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image_file = request.files['image']
        model_name = request.form.get('model', 'MobileNetV2')
        
        if model_name not in MODELS:
            return jsonify({'error': f'Invalid model: {model_name}'}), 400
        
        # Read image bytes
        image_bytes = image_file.read()
        
        # Load model (lazy loading)
        start_time = time.time()
        model = load_model(model_name)
        
        # Preprocess image
        processed_image = preprocess_image(image_bytes, model_name)
        
        # Run inference
        inference_start = time.time()
        predictions = model.predict(processed_image)
        inference_time = (time.time() - inference_start) * 1000  # Convert to ms
        
        # Decode predictions
        decoded = MODELS[model_name]['decode'](predictions, top=1)[0][0]
        class_id, class_name, confidence = decoded
        
        # Calculate total latency
        total_latency = (time.time() - start_time) * 1000
        
        return jsonify({
            'model': model_name,
            'output': class_name.replace('_', ' ').title(),
            'confidence': float(confidence),
            'latency': int(inference_time),
            'total_latency': int(total_latency)
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'models_loaded': [k for k, v in MODELS.items() if v['model'] is not None]})

if __name__ == '__main__':
    print("Starting AI Model Inference Server...")
    print("Available models:", list(MODELS.keys()))
    
    port = int(os.environ.get("PORT", 10000))  # Render provides PORT automatically
    app.run(host='0.0.0.0', port=port)
