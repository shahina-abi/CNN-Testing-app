"use client";
import React from 'react';

interface BatchResult {
    filename: string;
    results?: Array<{
        model: string;
        output: string;
        confidence: number;
        latency: number;
        error?: string;
    }>;
    cumulative?: {
        label: string;
        avg_confidence: number;
        risk_score?: number;
        risk_level?: string;
    };
    status: 'success' | 'error';
    error?: string;
}

interface BatchResultsDisplayProps {
    results: BatchResult[];
    summary: {
        total: number;
        processed: number;
        errors: number;
    };
    loading: boolean;
}

function RiskBadge({ level, score }: { level: string; score?: number }) {
    let bgColor = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    
    if (level === 'High') {
        bgColor = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    } else if (level === 'Medium') {
        bgColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    }
    
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${bgColor}`}>
            {level}
            {score !== undefined && <span className="text-[10px]">({score.toFixed(2)}/5)</span>}
        </span>
    );
}

export default function BatchResultsDisplay({ results, summary, loading }: BatchResultsDisplayProps) {
    if (loading) {
        return (
            <div className="w-full mt-8 p-8 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center min-h-[200px] animate-fade-in">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 dark:text-slate-300 font-semibold">Processing ZIP archive…</p>
                <p className="text-xs text-slate-400 mt-1">This may take a moment with multiple images.</p>
            </div>
        );
    }

    if (!results || results.length === 0) return null;

    return (
        <div className="w-full mt-8 space-y-6 animate-fade-in">
            {/* Summary Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-purple-200 text-xs font-semibold uppercase mb-1">Total Files</p>
                        <p className="text-3xl font-black">{summary.total}</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-xs font-semibold uppercase mb-1">Successfully Processed</p>
                        <p className="text-3xl font-black text-green-400">{summary.processed}</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-xs font-semibold uppercase mb-1">Errors</p>
                        <p className={`text-3xl font-black ${summary.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {summary.errors}
                        </p>
                    </div>
                </div>
            </div>

            {/* Results List */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Batch Results ({results.length} images)</h3>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                    {results.map((result, idx) => (
                        <div
                            key={idx}
                            className={`p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                                result.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        {result.status === 'error' ? (
                                            <span className="text-red-500 text-lg">❌</span>
                                        ) : (
                                            <span className="text-green-500 text-lg">✅</span>
                                        )}
                                        <p className="font-mono text-sm text-slate-700 dark:text-slate-300 font-semibold break-all">
                                            {result.filename}
                                        </p>
                                    </div>
                                    {result.status === 'error' && (
                                        <p className="text-xs text-red-600 dark:text-red-400 ml-6">{result.error}</p>
                                    )}
                                </div>

                                {result.status === 'success' && result.cumulative && (
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                                                Prediction
                                            </p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                {result.cumulative.label}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                                                Confidence
                                            </p>
                                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                {(result.cumulative.avg_confidence * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        {result.cumulative.risk_level && (
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                                                    Risk
                                                </p>
                                                <RiskBadge
                                                    level={result.cumulative.risk_level}
                                                    score={result.cumulative.risk_score}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Model results detail */}
                            {result.status === 'success' && result.results && result.results.length > 0 && (
                                <div className="mt-3 ml-6 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Models:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.results.map((modelResult, midx) => (
                                            <div
                                                key={midx}
                                                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                            >
                                                <span className="font-semibold">{modelResult.model}:</span>
                                                <span className="ml-1">{(modelResult.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Download Summary Button */}
            <button
                onClick={() => {
                    const summary_text = `Batch Processing Summary\n${'='.repeat(40)}\n\nTotal Files: ${summary.total}\nSuccessfully Processed: ${summary.processed}\nErrors: ${summary.errors}\n\nDetails:\n${results
                        .map(
                            r =>
                                `- ${r.filename}: ${r.status === 'success' ? `${r.cumulative?.label} (${(r.cumulative?.avg_confidence || 0) * 100}%)` : 'ERROR'}`
                        )
                        .join('\n')}`;
                    const blob = new Blob([summary_text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'batch_results.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                }}
                className="w-full py-2 px-4 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
                📥 Download Results
            </button>
        </div>
    );
}
