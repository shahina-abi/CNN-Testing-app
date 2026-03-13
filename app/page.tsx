// "use client";
// import React, { useState } from 'react';
// import ImageUpload from '@/components/ImageUpload';
// import ModelTypeSelector from '@/components/ModelTypeSelector';
// import ResultsDisplay from '@/components/ResultsDisplay';
// import BatchResultsDisplay from '@/components/BatchResultsDisplay';

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// interface SingleResult {
//   model: string;
//   output: string;
//   confidence: number;
//   latency: number;
//   error?: string;
//   top_3?: Array<{ label: string; confidence: number }>;
//   overlay_image?: string;
// }

// interface Cumulative {
//   label: string;
//   avg_confidence: number;
//   vote_count: number;
//   total_models: number;
// }

// interface BatchResult {
//   filename: string;
//   results?: SingleResult[];
//   cumulative?: Cumulative;
//   status: 'success' | 'error';
//   error?: string;
// }

// interface RunRecord {
//   id: number;
//   timestamp: Date;
//   imageName: string;
//   results: SingleResult[];
//   cumulative: Cumulative | null;
// }

// export default function Home() {
//   const [isBatchMode, setIsBatchMode] = useState(false);
//   const [modelType, setModelType] = useState<string>('histology');
//   const [selectedImage, setSelectedImage] = useState<File | null>(null);
//   const [selectedZip, setSelectedZip] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   // Current run
//   const [currentResults, setCurrentResults] = useState<SingleResult[]>([]);
//   const [currentCumulative, setCurrentCumulative] = useState<Cumulative | null>(null);

//   // Batch results
//   const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
//   const [batchSummary, setBatchSummary] = useState({ total: 0, processed: 0, errors: 0 });

//   // History
//   const [history, setHistory] = useState<RunRecord[]>([]);

//   const handleRunInference = async () => {
//     if (!selectedImage) return;
//     setLoading(true);
//     setCurrentResults([]);
//     setCurrentCumulative(null);
//     setErrorMessage(null);

//     const formData = new FormData();
//     formData.append('image', selectedImage);

//     const endpoint =
//       modelType === 'segmentation'
//         ? `${API_URL}/segment_tumor`
//         : `${API_URL}/predict_histology`;

//     try {
//       const res = await fetch(endpoint, { method: 'POST', body: formData });

//       if (!res.ok) {
//         const errData = await res.json().catch(() => ({}));
//         throw new Error(errData.detail || `Server error ${res.status}`);
//       }

//       const data = await res.json();

//       if (modelType === 'histology') {
//         const result: SingleResult = {
//           model: 'Histology Classifier (MobileNet)',
//           output: data.prediction,
//           confidence: data.confidence,
//           latency: data.latency_ms,
//           top_3: data.top_3,
//         };
//         setCurrentResults([result]);
//         setCurrentCumulative({
//           label: data.prediction,
//           avg_confidence: data.confidence,
//           vote_count: 1,
//           total_models: 1,
//         });
//       } else {
//         setCurrentResults([{
//           model: 'Tumor Segmentation (U-Net)',
//           output: `Tumor Area: ${data.tumor_area_percentage}%`,
//           confidence: 1.0,
//           latency: data.latency_ms,
//           overlay_image: data.overlay_image,
//         }]);
//       }

//       setHistory(prev => [{
//         id: Date.now(),
//         timestamp: new Date(),
//         imageName: selectedImage.name,
//         results: currentResults,
//         cumulative: currentCumulative,
//       } as RunRecord, ...prev.slice(0, 9)]);

//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : String(err);
//       setErrorMessage(
//         msg.includes('fetch') || msg.includes('Failed')
//           ? `Cannot reach backend at ${API_URL}. Make sure the backend server is running.`
//           : msg
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRunBatchInference = async () => {
//     if (!selectedZip) return;
//     setLoading(true);
//     setBatchResults([]);
//     setBatchSummary({ total: 0, processed: 0, errors: 0 });
//     setErrorMessage(null);

//     const formData = new FormData();
//     formData.append('archive', selectedZip);

//     try {
//       const res = await fetch(`${API_URL}/batch_histology_predict`, {
//         method: 'POST',
//         body: formData,
//       });

//       if (!res.ok) {
//         const errData = await res.json().catch(() => ({}));
//         throw new Error(errData.detail || `Server error ${res.status}`);
//       }

//       const data = await res.json();

//       const formattedResults: BatchResult[] = (data.results || []).map((r: any) => ({
//         filename: r.filename,
//         status: r.status,
//         error: r.error,
//         cumulative: r.status === 'success' ? {
//           label: r.prediction,
//           avg_confidence: r.confidence,
//         } : undefined,
//         results: r.status === 'success' ? [{
//           model: 'Histology Classifier',
//           output: r.prediction,
//           confidence: r.confidence,
//           latency: r.latency_ms,
//         }] : [],
//       }));

//       setBatchResults(formattedResults);
//       setBatchSummary({
//         total: formattedResults.length,
//         processed: formattedResults.filter(f => f.status === 'success').length,
//         errors: formattedResults.filter(f => f.status === 'error').length,
//       });
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : String(err);
//       setErrorMessage(
//         msg.includes('fetch') || msg.includes('Failed')
//           ? `Cannot reach backend at ${API_URL}. Make sure the backend server is running.`
//           : msg
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="min-h-screen p-6 md:p-12 pb-24">
//       <div className="max-w-5xl mx-auto">

//         {/* Header */}
//         <header className="mb-12 text-center md:text-left">
//           <div className="inline-block p-3 rounded-2xl bg-blue-100/50 dark:bg-blue-900/20 mb-4">
//             <span className="text-4xl">🔬</span>
//           </div>
//           <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
//             Medical <span className="text-blue-600 dark:text-blue-400">AI Testing Dashboard</span>
//           </h1>
//           <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
//             Upload histology slides and run tissue classification or tumor segmentation.
//           </p>
//         </header>

//         {/* Error Banner */}
//         {errorMessage && (
//           <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
//             <span className="text-red-500 text-xl mt-0.5">⚠️</span>
//             <div className="flex-1">
//               <p className="font-semibold text-red-700 dark:text-red-300 text-sm">Inference Error</p>
//               <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errorMessage}</p>
//             </div>
//             <button
//               onClick={() => setErrorMessage(null)}
//               className="text-red-400 hover:text-red-600 text-sm font-bold"
//             >
//               ✕
//             </button>
//           </div>
//         )}

//         {/* Controls row */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

//           {/* Left: Upload + Model selection + Run */}
//           <div className="space-y-8">
//             {/* Batch Mode Toggle */}
//             <section className="space-y-4">
//               <SectionLabel n={1}>Mode</SectionLabel>
//               <div className="flex gap-3 w-full max-w-md mx-auto">
//                 <button
//                   onClick={() => {
//                     setIsBatchMode(false);
//                     setSelectedZip(null);
//                     setCurrentResults([]);
//                     setCurrentCumulative(null);
//                     setErrorMessage(null);
//                   }}
//                   className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${!isBatchMode
//                     ? 'bg-blue-600 text-white shadow-lg'
//                     : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
//                     }`}
//                 >
//                   🖼️ Single Image
//                 </button>
//                 <button
//                   onClick={() => {
//                     setIsBatchMode(true);
//                     setSelectedImage(null);
//                     setCurrentResults([]);
//                     setCurrentCumulative(null);
//                     setErrorMessage(null);
//                   }}
//                   className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${isBatchMode
//                     ? 'bg-purple-600 text-white shadow-lg'
//                     : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
//                     }`}
//                 >
//                   📦 ZIP Batch
//                 </button>
//               </div>
//             </section>

//             <section className="space-y-4">
//               <SectionLabel n={2}>Upload</SectionLabel>
//               <ImageUpload
//                 onImageSelect={setSelectedImage}
//                 onZipSelect={setSelectedZip}
//                 isBatchMode={isBatchMode}
//               />
//             </section>

//             <section className="space-y-4">
//               <SectionLabel n={3}>Model Category</SectionLabel>
//               <ModelTypeSelector
//                 selectedType={modelType}
//                 onChange={setModelType}
//                 disabled={loading}
//               />
//             </section>

//             <button
//               onClick={isBatchMode ? handleRunBatchInference : handleRunInference}
//               disabled={isBatchMode ? !selectedZip || loading : !selectedImage || loading}
//               className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
//                 ${(isBatchMode ? !selectedZip : !selectedImage) || loading
//                   ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
//                   : isBatchMode
//                     ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/20'
//                     : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
//                 }`}
//             >
//               {loading
//                 ? <span className="flex items-center justify-center gap-2">
//                   <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
//                   {isBatchMode ? 'Processing batch…' : 'Running inference…'}
//                 </span>
//                 : isBatchMode
//                   ? 'Process ZIP'
//                   : `Run ${modelType === 'segmentation' ? 'Segmentation' : 'Classification'}`
//               }
//             </button>
//           </div>

//           {/* Right: placeholder when idle */}
//           {!isBatchMode && (
//             <div>
//               <SectionLabel n={4}>Analysis</SectionLabel>
//               {(!currentResults.length && !loading) && (
//                 <div className="mt-4 p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
//                   <p className="text-3xl mb-2">📊</p>
//                   <p className="text-sm">Upload an image and run inference to see results here.</p>
//                   <p className="text-xs mt-2 font-mono text-slate-300 dark:text-slate-600">{API_URL}</p>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Batch Results Display */}
//         {isBatchMode && (
//           <section className="mt-12">
//             <SectionLabel n={5}>Batch Results</SectionLabel>
//             <div className="mt-4">
//               <BatchResultsDisplay
//                 results={batchResults}
//                 summary={batchSummary}
//                 loading={loading}
//               />
//             </div>
//           </section>
//         )}

//         {/* Single Results */}
//         {!isBatchMode && (
//           <section className="mt-12">
//             <SectionLabel n={6}>Results</SectionLabel>
//             <div className="mt-4">
//               <ResultsDisplay
//                 result={currentResults.length > 0 ? currentResults[0] as any : null}
//                 loading={loading}
//               />
//             </div>
//           </section>
//         )}

//         {/* Run History */}
//         {history.length > 0 && !isBatchMode && (
//           <section className="mt-10">
//             <SectionLabel n={7}>Run History</SectionLabel>
//             <div className="mt-4 space-y-3">
//               {history.map(run => (
//                 <div key={run.id} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm">
//                   <div className="text-slate-400 text-xs whitespace-nowrap">{run.timestamp.toLocaleTimeString()}</div>
//                   <div className="text-slate-500 dark:text-slate-400 truncate flex-1">{run.imageName}</div>
//                   <div className="flex gap-2 flex-wrap">
//                     {run.results.map(r => (
//                       <span key={r.model} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
//                         {r.model}: <b>{(r.confidence * 100).toFixed(0)}%</b>
//                       </span>
//                     ))}
//                   </div>
//                   <div className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
//                     → {run.cumulative?.label ?? 'N/A'}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </section>
//         )}

//       </div>
//     </main>
//   );
// }

// function SectionLabel({ n, children }: { n: number; children: React.ReactNode }) {
//   return (
//     <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
//       <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">{n}</span>
//       {children}
//     </h2>
//   );
// }
// "use client";
// import React, { useState, useEffect } from "react";

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// // ── Types ──────────────────────────────────────────────────────────────────
// interface ModelSpec {
//   id: string;
//   name: string;
//   params_m: number;
//   ram_mb: number;
//   throughput_day: number;
//   cancer_types: string[];
//   datasets: string[];
//   framework: string;
// }

// interface ModelResult {
//   status: "success" | "error";
//   model_id: string;
//   model_name: string;
//   classification: string;
//   classification_full: string;
//   confidence: number;
//   ece: number;
//   ece_status: "calibrated" | "borderline" | "uncalibrated";
//   specificity: number;
//   sensitivity: number;
//   risk: { score: number; level: "LOW" | "MODERATE" | "HIGH" };
//   top_3: { class: string; label: string; confidence: number }[];
//   resources: {
//     model_size_mb: number;
//     ram_usage_mb: number;
//     cpu_usage_pct: number;
//     gpu_usage_pct: number;
//     throughput_per_day: number;
//     inference_ms: number;
//     params_million: number;
//   };
//   cancer_types_covered: string[];
//   datasets_trained_on: string[];
//   error?: string;
// }

// interface Cumulative {
//   models_run: number;
//   majority_classification: string;
//   majority_classification_full: string;
//   avg_confidence: number;
//   avg_ece: number;
//   cumulative_risk_score: number;
//   risk_level: "LOW" | "MODERATE" | "HIGH";
// }

// interface BatchImageResult {
//   filename: string;
//   status: "success" | "error";
//   model_results: ModelResult[];
//   cumulative_risk: number;
//   risk_level: "LOW" | "MODERATE" | "HIGH";
// }

// // ── Helpers ────────────────────────────────────────────────────────────────
// const riskColor = (level: string) => ({
//   HIGH: "text-red-600 bg-red-50 border-red-200",
//   MODERATE: "text-amber-600 bg-amber-50 border-amber-200",
//   LOW: "text-emerald-600 bg-emerald-50 border-emerald-200",
// }[level] ?? "text-slate-600 bg-slate-50 border-slate-200");

// const eceColor = (s: string) => ({
//   calibrated: "text-emerald-700 bg-emerald-50",
//   borderline: "text-amber-700 bg-amber-50",
//   uncalibrated: "text-red-700 bg-red-50",
// }[s] ?? "");

// function MiniBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
//   return (
//     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
//       <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value * 100, 100)}%` }} />
//     </div>
//   );
// }

// function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
//   return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${className}`}>{children}</span>;
// }

// // ── Main Component ─────────────────────────────────────────────────────────
// export default function Home() {
//   const [availableModels, setAvailableModels] = useState<ModelSpec[]>([
//   { id: "mobilenetv2", name: "MobileNetV2 — Kather100K", params_m: 3.5, ram_mb: 150, throughput_day: 250, cancer_types: ["Colorectal"], datasets: ["Kather100K"], framework: "onnx" },
//   { id: "unet_segmentation", name: "U-Net — Tumor Segmentation", params_m: 7.0, ram_mb: 300, throughput_day: 120, cancer_types: ["Multi-cancer"], datasets: ["Custom"], framework: "onnx" },
// ]);
//   const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set(["mobilenetv2"]));

//   const [mode, setMode] = useState<"single" | "batch">("single");
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [zipFile, setZipFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Results
//   const [results, setResults] = useState<ModelResult[]>([]);
//   const [cumulative, setCumulative] = useState<Cumulative | null>(null);
//   const [batchResults, setBatchResults] = useState<BatchImageResult[]>([]);
//   const [batchSummary, setBatchSummary] = useState({ total: 0, processed: 0, errors: 0 });

//   // Load model list from backend on mount
//   useEffect(() => {
//    fetch(`${API_URL}/health`)
//       .then(r => r.json())
//       .then(d => setAvailableModels(d.models || []))
//       .catch(() => {
//         // Fallback model list if backend unreachable
//         setAvailableModels([{ id: "mobilenetv2", name: "MobileNetV2 — Kather100K", params_m: 3.5, ram_mb: 150, throughput_day: 250, cancer_types: ["Colorectal"], datasets: ["Kather100K"], framework: "onnx" },
//       { id: "unet_segmentation", name: "U-Net — Tumor Segmentation", params_m: 7.0, ram_mb: 300, throughput_day: 120, cancer_types: ["Multi-cancer"], datasets: ["Custom"], framework: "onnx" },
//           // { id: "mobilenetv2",   name: "MobileNetV2",       params_m: 3.5, ram_mb: 150, throughput_day: 250, cancer_types: ["Breast", "Skin"],    datasets: ["TCGA-BRCA", "ISIC"],        framework: "tensorflow" },
//           // { id: "mobilenetv3",   name: "MobileNetV3",       params_m: 4.5, ram_mb: 200, throughput_day: 275, cancer_types: ["Breast", "Lung"],    datasets: ["TCGA-BRCA", "LUNA16"],      framework: "tensorflow" },
//           // { id: "efficientnetv2",name: "EfficientNetV2-B0", params_m: 7.0, ram_mb: 300, throughput_day: 200, cancer_types: ["Metastatic"],        datasets: ["TCGA pan-cancer", "PCam"],  framework: "tensorflow" },
//           // { id: "squeezenet",    name: "SqueezeNet",        params_m: 0.75,ram_mb:  75, throughput_day: 320, cancer_types: ["Lung", "Colon"],     datasets: ["LC25000"],                  framework: "pytorch" },
//           // { id: "densenet121",   name: "DenseNet121",       params_m: 8.0, ram_mb: 325, throughput_day: 170, cancer_types: ["Lung", "Breast"],    datasets: ["TCGA", "PCam"],             framework: "pytorch" },
//         ]);
//       });
//   }, []);

//   const toggleModel = (id: string) => {
//     setSelectedModelIds(prev => {
//       const next = new Set(prev);
//       if (next.has(id)) { if (next.size > 1) next.delete(id); }
//       else next.add(id);
//       return next;
//     });
//   };

//   const handleImageChange = (file: File) => {
//     setImageFile(file);
//     const url = URL.createObjectURL(file);
//     setImagePreview(url);
//     setResults([]); setCumulative(null); setError(null);
//   };

//   const handleRun = async () => {
//     if (mode === "single" && !imageFile) return;
//     if (mode === "batch" && !zipFile) return;
//     setLoading(true); setError(null); setResults([]); setCumulative(null); setBatchResults([]);

//     const modelParam = Array.from(selectedModelIds).join(",");

//     try {
//       if (mode === "single") {
//         const fd = new FormData();
//         fd.append("image", imageFile!);
//         const res = await fetch(`${API_URL}/predict_multi_model`, { method: "POST", body: fd });
//         if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Server error ${res.status}`); }
//         const data = await res.json();
//         setResults(data.results || []);
//         setCumulative(data.cumulative || null);
//       } else {
//         const fd = new FormData();
//         fd.append("archive", zipFile!);
//         const res = await fetch(`${API_URL}/predict_batch?models=${modelParam}`, { method: "POST", body: fd });
//         if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Server error ${res.status}`); }
//         const data = await res.json();
//         setBatchResults(data.results || []);
//         setBatchSummary({ total: data.total_images, processed: data.processed, errors: data.errors });
//       }
//     } catch (err) {
//       const msg = err instanceof Error ? err.message : String(err);
//       setError(msg.includes("fetch") ? `Cannot reach backend at ${API_URL}. Is Railway running?` : msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const canRun = mode === "single" ? !!imageFile : !!zipFile;

//   return (
//     <main className="min-h-screen bg-slate-50 pb-20">
//       {/* Header */}
//       <header className="bg-white border-b border-slate-200 px-6 py-4 mb-6">
//         <div className="max-w-6xl mx-auto flex items-center justify-between">
//           <div>
//             <h1 className="text-xl font-bold text-slate-900">
//               🔬 Errorbite <span className="text-blue-600">CancerScreen</span>
//             </h1>
//             <p className="text-xs text-slate-500 mt-0.5">Multi-Cancer Model Compatibility Testing — Phase 1 · Image Data</p>
//           </div>
//           <div className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1 rounded border">{API_URL}</div>
//         </div>
//       </header>

//       <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

//         {/* ── LEFT COLUMN: Controls ── */}
//         <div className="space-y-4">

//           {/* Mode toggle */}
//           <div className="bg-white rounded-xl border border-slate-200 p-4">
//             <h2 className="text-sm font-semibold text-slate-700 mb-3">Input Mode</h2>
//             <div className="flex gap-2">
//               {(["single", "batch"] as const).map(m => (
//                 <button key={m} onClick={() => { setMode(m); setResults([]); setCumulative(null); setBatchResults([]); setError(null); }}
//                   className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
//                   {m === "single" ? "🖼️ Single Image" : "📦 ZIP Batch"}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Upload */}
//           <div className="bg-white rounded-xl border border-slate-200 p-4">
//             <h2 className="text-sm font-semibold text-slate-700 mb-3">
//               {mode === "single" ? "Upload Image" : "Upload ZIP"}
//             </h2>
//             {mode === "single" ? (
//               <label className="block cursor-pointer">
//                 <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${imageFile ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
//                   {imagePreview ? (
//                     <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded mb-2 object-contain" />
//                   ) : (
//                     <div className="py-4">
//                       <div className="text-3xl mb-2">⬆️</div>
//                       <p className="text-xs text-slate-500">JPG, PNG, TIFF<br/>Histology · MRI · CT · X-ray</p>
//                     </div>
//                   )}
//                   {imageFile && <p className="text-xs text-slate-500 truncate">{imageFile.name}</p>}
//                 </div>
//                 <input type="file" accept="image/*,.tiff,.tif" className="hidden"
//                   onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])} />
//               </label>
//             ) : (
//               <label className="block cursor-pointer">
//                 <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${zipFile ? "border-purple-300 bg-purple-50" : "border-slate-200 hover:border-purple-300"}`}>
//                   <div className="text-3xl mb-2">📦</div>
//                   <p className="text-xs text-slate-500">{zipFile ? zipFile.name : "Upload .zip of medical images"}</p>
//                 </div>
//                 <input type="file" accept=".zip" className="hidden"
//                   onChange={e => { if (e.target.files?.[0]) { setZipFile(e.target.files[0]); setError(null); } }} />
//               </label>
//             )}
//           </div>

//           {/* Model selector */}
//           <div className="bg-white rounded-xl border border-slate-200 p-4">
//             <h2 className="text-sm font-semibold text-slate-700 mb-1">Select Models</h2>
//             <p className="text-xs text-slate-400 mb-3">Select multiple for ensemble testing</p>
//             <div className="space-y-2">
//               {availableModels.map(m => {
//                 const selected = selectedModelIds.has(m.id);
//                 return (
//                   <div key={m.id} onClick={() => toggleModel(m.id)}
//                     className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${selected ? "border-blue-300 bg-blue-50" : "border-slate-100 hover:border-slate-300"}`}>
//                     <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 text-xs ${selected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>
//                       {selected && "✓"}
//                     </div>
//                     <div className="min-w-0">
//                       <div className="text-xs font-semibold text-slate-800">{m.name}</div>
//                       <div className="text-xs text-slate-400">{m.params_m}M params · {m.ram_mb}MB RAM</div>
//                       <div className="flex flex-wrap gap-1 mt-1">
//                         {m.cancer_types.slice(0, 2).map(c => (
//                           <span key={c} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c}</span>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Run button */}
//           <button onClick={handleRun} disabled={!canRun || loading}
//             className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${canRun && !loading ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
//             {loading ? (
//               <span className="flex items-center justify-center gap-2">
//                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                 Running {selectedModelIds.size} model{selectedModelIds.size > 1 ? "s" : ""}…
//               </span>
//             ) : `▶ Run ${selectedModelIds.size} Model${selectedModelIds.size > 1 ? "s" : ""}`}
//           </button>

//           {/* Important note */}
//           <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
//             <strong>⚠️ Research Use Only.</strong> Phase 1 testing. Not for clinical decisions.<br/>
//             <span className="text-amber-600 mt-1 block">Kather100K = histology slides only. MRI/CT needs RadImageNet/TCGA models.</span>
//           </div>
//         </div>

//         {/* ── RIGHT COLUMN: Results ── */}
//         <div className="lg:col-span-2 space-y-4">

//           {/* Error */}
//           {error && (
//             <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
//               <span className="text-red-500 text-lg">⚠️</span>
//               <div>
//                 <p className="text-sm font-semibold text-red-700">Error</p>
//                 <p className="text-sm text-red-600 mt-0.5">{error}</p>
//               </div>
//               <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
//             </div>
//           )}

//           {/* Cumulative score */}
//           {cumulative && (
//             <div className={`rounded-xl border-2 p-5 ${
//               cumulative.risk_level === "HIGH" ? "border-red-300 bg-red-50" :
//               cumulative.risk_level === "MODERATE" ? "border-amber-300 bg-amber-50" :
//               "border-emerald-300 bg-emerald-50"}`}>
//               <div className="flex items-start justify-between flex-wrap gap-4">
//                 <div>
//                   <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
//                     Ensemble Result · {cumulative.models_run} Model{cumulative.models_run > 1 ? "s" : ""}
//                   </p>
//                   <p className="text-2xl font-bold text-slate-900">{cumulative.majority_classification_full}</p>
//                   <p className="text-sm text-slate-500 mt-1">
//                     Avg Confidence: <strong>{(cumulative.avg_confidence * 100).toFixed(1)}%</strong>
//                     {" · "}Avg ECE: <strong>{cumulative.avg_ece.toFixed(3)}</strong>
//                   </p>
//                 </div>
//                 <div className="text-center">
//                   <div className={`text-5xl font-black ${
//                     cumulative.risk_level === "HIGH" ? "text-red-600" :
//                     cumulative.risk_level === "MODERATE" ? "text-amber-600" : "text-emerald-600"}`}>
//                     {cumulative.cumulative_risk_score}
//                   </div>
//                   <Pill className={riskColor(cumulative.risk_level)}>
//                     {cumulative.risk_level} RISK
//                   </Pill>
//                   <p className="text-xs text-slate-400 mt-1">/ 100</p>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Per-model results */}
//           {results.length > 0 && results.map(r => (
//             <div key={r.model_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
//               {/* Model header */}
//               <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
//                 <div>
//                   <span className="font-semibold text-slate-800 text-sm">{r.model_name}</span>
//                   <span className="ml-2 text-xs text-slate-400">{r.model_id}</span>
//                 </div>
//                 {r.status === "error"
//                   ? <Pill className="text-red-600 bg-red-50 border-red-200">Error</Pill>
//                   : <Pill className={eceColor(r.ece_status)}>
//                       {r.ece_status === "calibrated" ? "✓ Calibrated" : r.ece_status === "borderline" ? "⚠ Borderline" : "✗ Uncalibrated"}
//                     </Pill>
//                 }
//               </div>

//               {r.status === "error" ? (
//                 <div className="p-4 text-sm text-red-600">{r.error}</div>
//               ) : (
//                 <div className="p-4">
//                   {/* Classification */}
//                   <div className="mb-4 p-3 bg-slate-50 rounded-lg">
//                     <p className="text-xs text-slate-500 mb-0.5">Classification</p>
//                     <p className="font-semibold text-slate-900">{r.classification_full}</p>
//                     <p className="text-xs text-slate-400 mt-1">
//                       Top 3: {r.top_3.map(t => `${t.label} (${(t.confidence * 100).toFixed(1)}%)`).join(" · ")}
//                     </p>
//                   </div>

//                   {/* Metrics grid */}
//                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
//                     {[
//                       { label: "Confidence", value: `${(r.confidence * 100).toFixed(1)}%`, bar: r.confidence, color: "bg-blue-500" },
//                       { label: "Sensitivity", value: `${(r.sensitivity * 100).toFixed(1)}%`, bar: r.sensitivity, color: "bg-emerald-500" },
//                       { label: "Specificity", value: `${(r.specificity * 100).toFixed(1)}%`, bar: r.specificity, color: "bg-purple-500" },
//                     ].map(m => (
//                       <div key={m.label} className="bg-slate-50 rounded-lg p-2.5">
//                         <p className="text-xs text-slate-500">{m.label}</p>
//                         <p className="text-lg font-bold text-slate-800">{m.value}</p>
//                         <MiniBar value={m.bar} color={m.color} />
//                       </div>
//                     ))}
//                     <div className="bg-slate-50 rounded-lg p-2.5">
//                       <p className="text-xs text-slate-500">ECE ↓ lower=better</p>
//                       <p className={`text-lg font-bold ${r.ece_status === "calibrated" ? "text-emerald-700" : r.ece_status === "borderline" ? "text-amber-700" : "text-red-700"}`}>
//                         {r.ece.toFixed(3)}
//                       </p>
//                       <p className="text-xs text-slate-400">Acceptable: ≤ 0.10</p>
//                     </div>
//                     <div className="bg-slate-50 rounded-lg p-2.5">
//                       <p className="text-xs text-slate-500">Risk Score</p>
//                       <p className={`text-lg font-bold ${r.risk.level === "HIGH" ? "text-red-600" : r.risk.level === "MODERATE" ? "text-amber-600" : "text-emerald-600"}`}>
//                         {r.risk.score}
//                       </p>
//                       <Pill className={riskColor(r.risk.level) + " text-xs"}>{r.risk.level}</Pill>
//                     </div>
//                   </div>

//                   {/* Resources */}
//                   <details className="group">
//                     <summary className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 mb-2">
//                       ▸ Resource Usage (CPU / Memory / Speed)
//                     </summary>
//                     <div className="grid grid-cols-3 gap-2 text-center mt-2">
//                       {[
//                         { label: "RAM", value: `${r.resources.ram_usage_mb} MB` },
//                         { label: "CPU", value: `${r.resources.cpu_usage_pct}%` },
//                         { label: "Inference", value: `${r.resources.inference_ms} ms` },
//                         { label: "Model Size", value: `${r.resources.model_size_mb.toFixed(1)} MB` },
//                         { label: "Params", value: `${r.resources.params_million}M` },
//                         { label: "Throughput", value: `${r.resources.throughput_per_day}/day` },
//                       ].map(item => (
//                         <div key={item.label} className="bg-slate-50 rounded p-2">
//                           <p className="text-xs text-slate-400">{item.label}</p>
//                           <p className="text-sm font-semibold text-slate-700">{item.value}</p>
//                         </div>
//                       ))}
//                     </div>
//                     <div className="mt-2 flex flex-wrap gap-1">
//                       {r.datasets_trained_on.map(d => (
//                         <span key={d} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{d}</span>
//                       ))}
//                     </div>
//                   </details>
//                 </div>
//               )}
//             </div>
//           ))}

//           {/* Batch results */}
//           {batchResults.length > 0 && (
//             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
//               <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
//                 <h3 className="font-semibold text-slate-800">Batch Results</h3>
//                 <div className="flex gap-2 text-xs">
//                   <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ {batchSummary.processed} ok</span>
//                   {batchSummary.errors > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✗ {batchSummary.errors} err</span>}
//                 </div>
//               </div>
//               <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
//                 {batchResults.map((r, i) => (
//                   <div key={i} className="px-4 py-3 flex items-center gap-4">
//                     <span className="text-xs text-slate-400 font-mono w-8 flex-shrink-0">{i + 1}</span>
//                     <span className="text-sm text-slate-700 truncate flex-1">{r.filename}</span>
//                     <span className="text-sm font-medium text-slate-600 hidden sm:block">
//                       {r.model_results[0]?.classification_full ?? "—"}
//                     </span>
//                     <span className={`text-sm font-bold flex-shrink-0 ${r.risk_level === "HIGH" ? "text-red-600" : r.risk_level === "MODERATE" ? "text-amber-600" : "text-emerald-600"}`}>
//                       {r.cumulative_risk}
//                     </span>
//                     <Pill className={riskColor(r.risk_level)}>{r.risk_level}</Pill>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Empty state */}
//           {!loading && results.length === 0 && batchResults.length === 0 && !error && (
//             <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
//               <div className="text-4xl mb-3">🧬</div>
//               <p className="text-slate-500 text-sm">Upload an image and click Run to see model results</p>
//               <p className="text-slate-400 text-xs mt-2">Supports single images and ZIP batches · Multi-model ensemble testing</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </main>
//   );
// }

"use client";
import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types matching exact backend response ──────────────────────────────────
interface Top3Item {
  code: string;
  label: string;
  confidence: number;
}

interface ModelResult {
  status: "success" | "error";
  model_id: string;
  model_name: string;
  classification: string;
  confidence?: number;
  top_3?: Top3Item[];
  risk_level?: string;
  risk_score?: number;
  ece?: number;
  specificity?: number;
  sensitivity?: number;
  latency_ms?: number;
  model_size_mb?: number;
  params_million?: number;
  ram_used_mb?: number;
  cpu_percent?: number;
  tumor_area_percent?: number;
  framework?: string;
  note?: string;
  error?: string;
}

interface Cumulative {
  models_run: number;
  avg_risk_score: number;
  risk_level: string;
  recommendation: string;
}

// Batch: each item is a flat result with filename added
interface BatchFileResult extends ModelResult {
  filename: string;
}

interface BatchSummary {
  total_images: number;
  processed: number;
  errors: number;
  avg_risk_score: number;
  risk_distribution: { HIGH: number; MEDIUM: number; LOW: number };
}

interface ModelSpec {
  id: string;
  name: string;
  params_m: number;
  ram_mb: number;
  cancer_types: string[];
}

// ── Static model list ──────────────────────────────────────────────────────
const AVAILABLE_MODELS: ModelSpec[] = [
  { id: "mobilenet_kather", name: "MobileNetV2 — Kather100K", params_m: 3.5, ram_mb: 150, cancer_types: ["Colorectal"] },
  { id: "unet_segmentation", name: "U-Net — Tumor Segmentation", params_m: 31.0, ram_mb: 300, cancer_types: ["Multi-cancer"] },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const riskColor = (level?: string) => ({
  HIGH:   "text-red-600 bg-red-50 border-red-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  LOW:    "text-emerald-600 bg-emerald-50 border-emerald-200",
}[level ?? ""] ?? "text-slate-600 bg-slate-50 border-slate-200");

const riskBorder = (level?: string) => ({
  HIGH:   "border-red-300 bg-red-50",
  MEDIUM: "border-amber-300 bg-amber-50",
  LOW:    "border-emerald-300 bg-emerald-50",
}[level ?? ""] ?? "border-slate-200 bg-white");

const riskText = (level?: string) => ({
  HIGH:   "text-red-600",
  MEDIUM: "text-amber-600",
  LOW:    "text-emerald-600",
}[level ?? ""] ?? "text-slate-600");

function MiniBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value * 100, 100)}%` }} />
    </div>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${className}`}>{children}</span>;
}

function ResultCard({ r }: { r: ModelResult }) {
  if (r.status === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
        ✗ {r.error}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div>
          <span className="font-semibold text-slate-800 text-sm">{r.model_name}</span>
        </div>
        <Pill className={riskColor(r.risk_level)}>{r.risk_level} RISK</Pill>
      </div>
      <div className="p-4">
        {/* Classification */}
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-0.5">Classification</p>
          <p className="font-semibold text-slate-900">{r.classification}</p>
          {r.top_3 && (
            <p className="text-xs text-slate-400 mt-1">
              Top 3: {r.top_3.map(t => `${t.label} (${(t.confidence * 100).toFixed(1)}%)`).join(" · ")}
            </p>
          )}
          {r.note && <p className="text-xs text-amber-600 mt-2 italic">{r.note}</p>}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {r.confidence !== undefined && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">Confidence</p>
              <p className="text-lg font-bold text-slate-800">{(r.confidence * 100).toFixed(1)}%</p>
              <MiniBar value={r.confidence} color="bg-blue-500" />
            </div>
          )}
          {r.sensitivity !== undefined && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">Sensitivity</p>
              <p className="text-lg font-bold text-slate-800">{(r.sensitivity * 100).toFixed(1)}%</p>
              <MiniBar value={r.sensitivity} color="bg-emerald-500" />
            </div>
          )}
          {r.specificity !== undefined && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">Specificity</p>
              <p className="text-lg font-bold text-slate-800">{(r.specificity * 100).toFixed(1)}%</p>
              <MiniBar value={r.specificity} color="bg-purple-500" />
            </div>
          )}
          {r.ece !== undefined && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">ECE ↓</p>
              <p className={`text-lg font-bold ${r.ece <= 0.10 ? "text-emerald-700" : r.ece <= 0.20 ? "text-amber-700" : "text-red-700"}`}>
                {r.ece.toFixed(3)}
              </p>
              <p className="text-xs text-slate-400">≤ 0.10 good</p>
            </div>
          )}
          {r.risk_score !== undefined && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">Risk Score</p>
              <p className={`text-lg font-bold ${riskText(r.risk_level)}`}>{r.risk_score}</p>
              <Pill className={riskColor(r.risk_level)}>{r.risk_level}</Pill>
            </div>
          )}
          {r.tumor_area_percent !== undefined && (
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">Tumor Area</p>
              <p className="text-lg font-bold text-slate-800">{r.tumor_area_percent}%</p>
              <MiniBar value={r.tumor_area_percent / 100} color="bg-red-500" />
            </div>
          )}
        </div>

        {/* Resources collapsible */}
        <details>
          <summary className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700">
            ▸ Resource Usage
          </summary>
          <div className="grid grid-cols-3 gap-2 text-center mt-2">
            {[
              { label: "RAM", value: `${r.ram_used_mb} MB` },
              { label: "CPU", value: `${r.cpu_percent}%` },
              { label: "Speed", value: `${r.latency_ms} ms` },
              { label: "Model", value: `${r.model_size_mb} MB` },
              { label: "Params", value: `${r.params_million}M` },
              { label: "Engine", value: r.framework ?? "onnx" },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded p-2">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Home() {
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set(["mobilenet_kather"]));
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<ModelResult[]>([]);
  const [cumulative, setCumulative] = useState<Cumulative | null>(null);
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);

  const toggleModel = (id: string) => {
    setSelectedModelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const handleImageChange = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResults([]); setCumulative(null); setError(null);
  };

  const handleRun = async () => {
    if (mode === "single" && !imageFile) return;
    if (mode === "batch" && !zipFile) return;
    setLoading(true); setError(null);
    setResults([]); setCumulative(null); setBatchResults([]); setBatchSummary(null);

    try {
      if (mode === "single") {
        const fd = new FormData();
        fd.append("image", imageFile!);
        const res = await fetch(`${API_URL}/predict_multi_model`, { method: "POST", body: fd });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Server error ${res.status}`); }
        const data = await res.json();
        setResults(data.results || []);
        setCumulative(data.cumulative || null);
      } else {
        const fd = new FormData();
        fd.append("archive", zipFile!);
        const res = await fetch(`${API_URL}/batch_histology_predict`, { method: "POST", body: fd });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Server error ${res.status}`); }
        const data = await res.json();
        setBatchResults(data.results || []);
        setBatchSummary(data.summary || null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("fetch") ? `Cannot reach backend at ${API_URL}. Is the backend running?` : msg);
    } finally {
      setLoading(false);
    }
  };

  const canRun = mode === "single" ? !!imageFile : !!zipFile;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 mb-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">🔬 BioSetup <span className="text-blue-600">Lifesciences</span></h1>
            <p className="text-xs text-slate-500 mt-0.5">Multi-Cancer AI Risk Stratification — Phase 1 Research · Image Data</p>
          </div>
          <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded border border-emerald-200 font-medium">● API Connected</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* Mode toggle */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Input Mode</h2>
            <div className="flex gap-2">
              {(["single", "batch"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setResults([]); setCumulative(null); setBatchResults([]); setBatchSummary(null); setError(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {m === "single" ? "🖼️ Single Image" : "📦 ZIP Batch"}
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              {mode === "single" ? "Upload Image" : "Upload ZIP"}
            </h2>
            {mode === "single" ? (
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${imageFile ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded mb-2 object-contain" />
                    : <div className="py-4"><div className="text-3xl mb-2">⬆️</div><p className="text-xs text-slate-500">JPG, PNG, TIFF</p></div>
                  }
                  {imageFile && <p className="text-xs text-slate-500 truncate">{imageFile.name}</p>}
                </div>
                <input type="file" accept="image/*,.tiff,.tif" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])} />
              </label>
            ) : (
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${zipFile ? "border-purple-300 bg-purple-50" : "border-slate-200 hover:border-purple-300"}`}>
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-xs text-slate-500">{zipFile ? zipFile.name : "Upload .zip of images"}</p>
                  <p className="text-xs text-slate-400 mt-1">Put JPG/PNG images directly in ZIP (no subfolders)</p>
                </div>
                <input type="file" accept=".zip" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) { setZipFile(e.target.files[0]); setError(null); } }} />
              </label>
            )}
          </div>

          {/* Model selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Select Models</h2>
            <p className="text-xs text-slate-400 mb-3">Select multiple for ensemble testing</p>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map(m => {
                const selected = selectedModelIds.has(m.id);
                return (
                  <div key={m.id} onClick={() => toggleModel(m.id)}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${selected ? "border-blue-300 bg-blue-50" : "border-slate-100 hover:border-slate-300"}`}>
                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 text-xs ${selected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>
                      {selected && "✓"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-400">{m.params_m}M params · {m.ram_mb}MB RAM</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.cancer_types.map(c => (
                          <span key={c} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Run button */}
          <button onClick={handleRun} disabled={!canRun || loading}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${canRun && !loading ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === "single" ? "Running models…" : "Processing ZIP…"}
              </span>
            ) : mode === "single"
              ? `▶ Run ${selectedModelIds.size} Model${selectedModelIds.size > 1 ? "s" : ""}`
              : "📦 Process ZIP Batch"
            }
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>⚠️ Research Use Only.</strong> Phase 1 testing. Not for clinical decisions.<br />
            <span className="text-amber-600 mt-1 block">Kather100K = histology slides only. MRI/CT needs RadImageNet/TCGA models.</span>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <div><p className="text-sm font-semibold text-red-700">Error</p><p className="text-sm text-red-600 mt-0.5">{error}</p></div>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* ── SINGLE MODE ── */}
          {mode === "single" && (
            <>
              {cumulative && (
                <div className={`rounded-xl border-2 p-5 ${riskBorder(cumulative.risk_level)}`}>
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Ensemble · {cumulative.models_run} Model{cumulative.models_run > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{cumulative.recommendation}</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-5xl font-black ${riskText(cumulative.risk_level)}`}>{cumulative.avg_risk_score}</div>
                      <Pill className={riskColor(cumulative.risk_level)}>{cumulative.risk_level} RISK</Pill>
                      <p className="text-xs text-slate-400 mt-1">/ 100</p>
                    </div>
                  </div>
                </div>
              )}
              {results.map(r => <ResultCard key={r.model_id} r={r} />)}
            </>
          )}

          {/* ── BATCH MODE ── */}
          {mode === "batch" && (
            <>
              {/* Batch summary */}
              {batchSummary && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Batch Summary</h3>
                  <div className="flex gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-800">{batchSummary.total_images}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-emerald-600">{batchSummary.processed}</p>
                      <p className="text-xs text-slate-500">Processed</p>
                    </div>
                    {batchSummary.errors > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-black text-red-600">{batchSummary.errors}</p>
                        <p className="text-xs text-slate-500">Errors</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className={`text-2xl font-black ${riskText(batchSummary.avg_risk_score > 60 ? "HIGH" : batchSummary.avg_risk_score > 30 ? "MEDIUM" : "LOW")}`}>
                        {batchSummary.avg_risk_score}
                      </p>
                      <p className="text-xs text-slate-500">Avg Risk</p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {batchSummary.risk_distribution.HIGH > 0 && (
                        <Pill className="text-red-600 bg-red-50 border-red-200">🔴 {batchSummary.risk_distribution.HIGH} HIGH</Pill>
                      )}
                      {batchSummary.risk_distribution.MEDIUM > 0 && (
                        <Pill className="text-amber-600 bg-amber-50 border-amber-200">🟡 {batchSummary.risk_distribution.MEDIUM} MEDIUM</Pill>
                      )}
                      {batchSummary.risk_distribution.LOW > 0 && (
                        <Pill className="text-emerald-600 bg-emerald-50 border-emerald-200">🟢 {batchSummary.risk_distribution.LOW} LOW</Pill>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Per-file results */}
              {batchResults.map((r, i) => (
                <div key={i} className={`rounded-xl border-2 overflow-hidden ${riskBorder(r.risk_level)}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        📄 {r.filename.split("/").pop()}
                      </p>
                      <p className="text-xs text-slate-400">{r.model_name}</p>
                    </div>
                    <Pill className={riskColor(r.risk_level)}>{r.risk_level} · {r.risk_score}</Pill>
                  </div>
                  <div className="p-4 bg-white">
                    <ResultCard r={r} />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {!loading && results.length === 0 && batchResults.length === 0 && !error && (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="text-4xl mb-3">🧬</div>
              <p className="text-slate-500 text-sm">
                {mode === "single" ? "Upload an image and click Run to see results" : "Upload a ZIP of histology images and click Process"}
              </p>
              <p className="text-slate-400 text-xs mt-2">Multi-model ensemble · Phase 1 research prototype</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}