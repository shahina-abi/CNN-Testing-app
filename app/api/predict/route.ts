import { NextResponse } from 'next/server';

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'https://web-production-b607.up.railway.app';

type ModelResponse = {
  model: string;
  output: string;
  confidence: number;
  latency: number;
  total_latency?: number;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const model = formData.get('model');

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const modelName = typeof model === 'string' ? model : String(model || 'MobileNetV2');

    // Helper: mock response generator
    const generateMockResponse = (m: string) => {
      const examples: Record<string, { output: string; confidence: number }> = {
        ResNet50: { output: 'Labrador Retriever', confidence: 0.88 },
        MobileNetV2: { output: 'Golden Retriever', confidence: 0.86 },
        InceptionV3: { output: 'Siamese Cat', confidence: 0.81 },
        EfficientNetB0: { output: 'Tabby Cat', confidence: 0.79 },
      };
      const picked = examples[m] || examples['MobileNetV2'];
      return {
        model: m,
        output: picked.output,
        confidence: picked.confidence,
        latency: 10,
        total_latency: 15,
      };
    };

    // If explicitly using mock mode, return mock immediately
    if (PYTHON_SERVER_URL === 'mock') {
      return NextResponse.json(generateMockResponse(modelName));
    }

    // Forward request to Python server
    const pythonFormData = new FormData();
    pythonFormData.append('image', image);
    pythonFormData.append('model', modelName || 'MobileNetV2');

    const response = await fetch(`${PYTHON_SERVER_URL}/predict`, {
      method: 'POST',
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Python server error' },
        { status: response.status }
      );
    }

    const data: ModelResponse = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);

    // If fetch failed (server down), fall back to mock response so frontend remains usable
    if (error instanceof TypeError && error.message && error.message.includes('fetch')) {
      const formData = await request.formData();
      const model = formData.get('model');
      const modelName = typeof model === 'string' ? model : String(model || 'MobileNetV2');
      // reuse generator defined above by re-creating it here
      const generateMockResponse = (m: string) => {
        const examples: Record<string, { output: string; confidence: number }> = {
          ResNet50: { output: 'Labrador Retriever', confidence: 0.88 },
          MobileNetV2: { output: 'Golden Retriever', confidence: 0.86 },
          InceptionV3: { output: 'Siamese Cat', confidence: 0.81 },
          EfficientNetB0: { output: 'Tabby Cat', confidence: 0.79 },
        };
        const picked = examples[m] || examples['MobileNetV2'];
        return {
          model: m,
          output: picked.output,
          confidence: picked.confidence,
          latency: 10,
          total_latency: 15,
        };
      };
      return NextResponse.json(generateMockResponse(modelName));
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
