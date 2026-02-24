import { NextResponse } from 'next/server';

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:5000';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const archive = formData.get('archive');
    const models = formData.get('models');

    if (!archive) return NextResponse.json({ error: 'No ZIP file provided' }, { status: 400 });

    const pf = new FormData();
    pf.append('archive', archive);
    pf.append('models', String(models || 'MobileNetV2'));

    const response = await fetch(`${PYTHON_SERVER_URL}/batch-predict`, {
      method: 'POST',
      body: pf,
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error || 'Python server error' }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    if (error instanceof TypeError && String(error).includes('fetch')) {
      return NextResponse.json(
        { error: 'Inference server offline. Run: cd python-server && python server.py' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
