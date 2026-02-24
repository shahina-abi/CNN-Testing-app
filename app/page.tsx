"use client";
import React, { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import ModelSelector from '@/components/ModelSelector';
import ResultsTable from '@/components/ResultsTable';
import ModelSpecsTable from '@/components/ModelSpecsTable';
import BatchResultsDisplay from '@/components/BatchResultsDisplay';

interface SingleResult {
  model: string;
  output: string;
  confidence: number;
  latency: number;
  error?: string;
}

interface Cumulative {
  label: string;
  avg_confidence: number;
  vote_count: number;
  total_models: number;
}

interface BatchResult {
  filename: string;
  results?: SingleResult[];
  cumulative?: Cumulative;
  status: 'success' | 'error';
  error?: string;
}

interface RunRecord {
  id: number;
  timestamp: Date;
  imageName: string;
  results: SingleResult[];
  cumulative: Cumulative;
}

export default function Home() {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(['MobileNetV2', 'EfficientNetB0']);
  const [loading, setLoading] = useState(false);

  // Current run
  const [currentResults, setCurrentResults] = useState<SingleResult[]>([]);
  const [currentCumulative, setCurrentCumulative] = useState<Cumulative | null>(null);

  // Batch results
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchSummary, setBatchSummary] = useState({ total: 0, processed: 0, errors: 0 });

  // History
  const [history, setHistory] = useState<RunRecord[]>([]);

  const handleRunInference = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setCurrentResults([]);
    setCurrentCumulative(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('models', selectedModels.join(','));

    try {
      const res = await fetch('/api/predict', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setCurrentResults(data.results ?? []);
      setCurrentCumulative(data.cumulative ?? null);

      setHistory(prev => [{
        id: Date.now(),
        timestamp: new Date(),
        imageName: selectedImage.name,
        results: data.results ?? [],
        cumulative: data.cumulative,
      }, ...prev.slice(0, 9)]);   // keep last 10 runs

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Inference failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBatchInference = async () => {
    if (!selectedZip) return;
    setLoading(true);
    setBatchResults([]);
    setBatchSummary({ total: 0, processed: 0, errors: 0 });

    const formData = new FormData();
    formData.append('archive', selectedZip);
    formData.append('models', selectedModels.join(','));

    try {
      const res = await fetch('/api/batch-predict', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setBatchResults(data.results ?? []);
      setBatchSummary(data.summary ?? { total: 0, processed: 0, errors: 0 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Batch processing failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 pb-24">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="mb-12 text-center md:text-left">
          <div className="inline-block p-3 rounded-2xl bg-blue-100/50 dark:bg-blue-900/20 mb-4">
            <span className="text-4xl">🧠</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            AI Model <span className="text-blue-600 dark:text-blue-400">Compatibility Lab</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Upload a medical image, select CNN architectures, and compare predictions side-by-side.
          </p>
        </header>

        {/* Controls row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: Upload + Model selection + Run */}
          <div className="space-y-8">
            {/* Batch Mode Toggle */}
            <section className="space-y-4">
              <SectionLabel n={1}>Mode</SectionLabel>
              <div className="flex gap-3 w-full max-w-md mx-auto">
                <button
                  onClick={() => {
                    setIsBatchMode(false);
                    setSelectedZip(null);
                    setCurrentResults([]);
                    setCurrentCumulative(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    !isBatchMode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🖼️ Single Image
                </button>
                <button
                  onClick={() => {
                    setIsBatchMode(true);
                    setSelectedImage(null);
                    setCurrentResults([]);
                    setCurrentCumulative(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    isBatchMode
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  📦 ZIP Batch
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <SectionLabel n={2}>Upload</SectionLabel>
              <ImageUpload
                onImageSelect={setSelectedImage}
                onZipSelect={setSelectedZip}
                isBatchMode={isBatchMode}
              />
            </section>

            <section className="space-y-4">
              <SectionLabel n={3}>Select Models</SectionLabel>
              <ModelSelector
                selectedModels={selectedModels}
                onChange={setSelectedModels}
                disabled={loading}
              />
            </section>

            <button
              onClick={isBatchMode ? handleRunBatchInference : handleRunInference}
              disabled={isBatchMode ? !selectedZip || loading : !selectedImage || loading}
              className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                ${(isBatchMode ? !selectedZip : !selectedImage) || loading
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                  : isBatchMode
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                }`}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  {isBatchMode ? 'Processing' : 'Running'} {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''}…
                </span>
                : isBatchMode
                ? `Process ZIP with ${selectedModels.length} Model${selectedModels.length > 1 ? 's' : ''}`
                : `Run Inference on ${selectedModels.length} Model${selectedModels.length > 1 ? 's' : ''}`
              }
            </button>
          </div>

          {/* Right: placeholder when idle */}
          {!isBatchMode && (
            <div>
              <SectionLabel n={4}>Analysis</SectionLabel>
              {(!currentResults.length && !loading) && (
                <div className="mt-4 p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-sm">Select models and upload an image to see results here.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Model Specs Table */}
        <section className="mt-12">
          <SectionLabel n={isBatchMode ? 4 : 5}>Model Specifications</SectionLabel>
          <div className="mt-4">
            <ModelSpecsTable selectedModels={selectedModels} />
          </div>
        </section>

        {/* Batch Results Display */}
        {isBatchMode && (
          <section className="mt-12">
            <SectionLabel n={5}>Batch Results</SectionLabel>
            <div className="mt-4">
              <BatchResultsDisplay
                results={batchResults}
                summary={batchSummary}
                loading={loading}
              />
            </div>
          </section>
        )}

        {/* Single Results Table (full width below controls) */}
        {!isBatchMode && (
          <section className="mt-12">
            <SectionLabel n={6}>Results</SectionLabel>
            <div className="mt-4">
              <ResultsTable
                results={currentResults}
                cumulative={currentCumulative}
                loading={loading}
              />
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && !isBatchMode && (
          <section className="mt-10">
            <SectionLabel n={7}>Run History</SectionLabel>
            <div className="mt-4 space-y-3">
              {history.map(run => (
                <div key={run.id} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm">
                  <div className="text-slate-400 text-xs whitespace-nowrap">{run.timestamp.toLocaleTimeString()}</div>
                  <div className="text-slate-500 dark:text-slate-400 truncate flex-1">{run.imageName}</div>
                  <div className="flex gap-2 flex-wrap">
                    {run.results.map(r => (
                      <span key={r.model} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
                        {r.model}: <b>{(r.confidence * 100).toFixed(0)}%</b>
                      </span>
                    ))}
                  </div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    → {run.cumulative?.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

function SectionLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">{n}</span>
      {children}
    </h2>
  );
}
