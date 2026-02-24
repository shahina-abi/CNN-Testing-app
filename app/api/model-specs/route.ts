import { NextResponse } from 'next/server';

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/model-specs`);

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
