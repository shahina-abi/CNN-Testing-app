"use client";

import React, { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import ModelSelector from '@/components/ModelSelector';
import ResultsDisplay from '@/components/ResultsDisplay';
import HistoryLog from '@/components/HistoryLog';

interface Result {
  model: string;
  output: string;
  confidence: number;
  latency: number;
  timestamp: Date;
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('MobileNetV2');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<Result[]>([]);

  const handleTestModel = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('model', selectedModel);

    try {
      const startTime = performance.now();
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      const endTime = performance.now();

      if (data.error) throw new Error(data.error);

      // Use backend latency if provided, otherwise calculate rough E2E
      // The backend provides 'latency' which simulates model inference time.

      const newResult: Result = {
        model: data.model,
        output: data.output,
        confidence: data.confidence,
        latency: data.latency, // Using model latency from backend
        timestamp: new Date(),
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev]);
    } catch (error) {
      console.error("Inference failed", error);
      alert("Inference failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 pb-24">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center md:text-left">
          <div className="inline-block p-3 rounded-2xl bg-blue-100/50 dark:bg-blue-900/20 mb-4">
            <span className="text-4xl">🧠</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            AI Model <span className="text-blue-600 dark:text-blue-400">Compatibility Lab</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Upload images, switch architectures, and benchmark inference performance in real-time.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Controls */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">1</span>
                Upload Image
              </h2>
              <ImageUpload onImageSelect={setSelectedImage} />
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">2</span>
                Configuration
              </h2>
              <ModelSelector
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                disabled={loading}
              />
            </section>

            <button
              onClick={handleTestModel}
              disabled={!selectedImage || loading}
              className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]
                ${!selectedImage || loading
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                }`}
            >
              {loading ? 'Processing...' : 'Run Inference'}
            </button>
          </div>

          {/* Right Column: Results */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">3</span>
              Analysis
            </h2>
            <ResultsDisplay result={result} loading={loading} />
            <HistoryLog history={history} />
          </div>
        </div>
      </div>
    </main>
  );
}
