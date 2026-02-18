# AI Model Testing Dashboard

A Next.js application for testing AI model compatibility with real-time image classification using pretrained CNN models.

## Features
- Upload images via drag-and-drop or file selection
- Test multiple CNN architectures (ResNet50, MobileNetV2, InceptionV3, EfficientNetB0)
- Real-time inference with actual pretrained models
- Performance benchmarking (latency tracking)
- History log of test runs

## Setup

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Set Up Python Inference Server
```bash
cd python-server
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start the Python Server
```bash
cd python-server
source venv/bin/activate  # If not already activated
python server.py
```

The Python server will start on `http://localhost:5000` and download pretrained models on first use.

### 4. Start the Next.js Development Server
In a new terminal:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or 3001 if port is busy).

## Usage
1. Upload an image (JPG, PNG, etc.)
2. Select a model from the dropdown
3. Click "Run Inference"
4. View the classification result, confidence score, and latency
5. Compare results across different models in the history log

## Architecture
- **Frontend**: Next.js 16 with React and Tailwind CSS
- **Backend API**: Next.js API routes (proxy layer)
- **Inference Server**: Python Flask + TensorFlow with pretrained ImageNet models

## Models
All models are pretrained on ImageNet and support 1000 object classes:
- **ResNet50**: Deep residual network (25M params)
- **MobileNetV2**: Efficient mobile architecture (3.5M params)
- **InceptionV3**: Google's inception architecture (24M params)
- **EfficientNetB0**: Compound scaling method (5.3M params)

## Notes
- Models are lazy-loaded on first use to reduce startup time
- First inference per model will be slower due to model loading
- Subsequent inferences will be faster
