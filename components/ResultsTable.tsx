"use client";
import React from 'react';

interface SingleResult {
    model: string;
    output: string;
    confidence: number;
    latency: number;
    calibration_error?: number;
    accuracy?: number;
    error?: string;
}

interface Cumulative {
    label: string;
    avg_confidence: number;
    vote_count: number;
    total_models: number;
    risk_score?: number;
    risk_level?: string;
    avg_calibration_error?: number;
}

interface ResultsTableProps {
    results: SingleResult[];
    cumulative: Cumulative | null;
    loading: boolean;
}

function ConfBar({ pct }: { pct: number }) {
    const color = pct >= 0.7 ? 'bg-green-500' : pct >= 0.4 ? 'bg-yellow-400' : 'bg-red-400';
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-bold w-12 text-right">{(pct * 100).toFixed(1)}%</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-[60px]">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct * 100}%` }} />
            </div>
        </div>
    );
}

function LatencyBadge({ ms }: { ms: number }) {
    const color = ms < 200 ? 'text-green-600 bg-green-50' : ms < 600 ? 'text-yellow-700 bg-yellow-50' : 'text-red-600 bg-red-50';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${color}`}>{ms} ms</span>;
}

function CalibrationBadge({ ce }: { ce: number }) {
    // EC < 0.2 = Green, 0.2-0.5 = Yellow, > 0.5 = Red
    let color = 'text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300';
    if (ce >= 0.5) {
        color = 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300';
    } else if (ce >= 0.2) {
        color = 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{(ce * 100).toFixed(1)}%</span>;
}

function RiskBadge({ level, score }: { level: string; score: number }) {
    let bgColor = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    let borderColor = 'border-green-300 dark:border-green-700';
    
    if (level === 'High') {
        bgColor = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        borderColor = 'border-red-300 dark:border-red-700';
    } else if (level === 'Medium') {
        bgColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
        borderColor = 'border-yellow-300 dark:border-yellow-700';
    }
    
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bgColor} ${borderColor} border`}>
            <span className="font-semibold text-sm">{level}</span>
            <span className="text-xs opacity-75">{score.toFixed(2)}/5</span>
        </div>
    );
}

export default function ResultsTable({ results, cumulative, loading }: ResultsTableProps) {
    if (loading) {
        return (
            <div className="w-full mt-6 p-8 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center min-h-[200px] animate-fade-in">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin-slow mb-4"></div>
                <p className="text-slate-600 dark:text-slate-300 font-semibold">Running inference on all models…</p>
                <p className="text-xs text-slate-400 mt-1">Models run in parallel. First load may take longer.</p>
            </div>
        );
    }

    if (!results || results.length === 0) return null;

    // Find best model by confidence
    const best = [...results].sort((a, b) => b.confidence - a.confidence)[0];

    return (
        <div className="w-full mt-6 space-y-4 animate-fade-in">

            {/* Cumulative Banner */}
            {cumulative && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1">
                            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Cumulative Prediction (Majority Vote)</p>
                            <p className="text-2xl font-extrabold">{cumulative.label}</p>
                            <p className="text-blue-200 text-xs mt-1">{cumulative.vote_count}/{cumulative.total_models} models agree</p>
                        </div>
                        <div className="flex flex-col gap-3 items-end">
                            <div>
                                <p className="text-blue-200 text-xs mb-1">Avg. Confidence</p>
                                <p className="text-3xl font-black">{(cumulative.avg_confidence * 100).toFixed(1)}%</p>
                            </div>
                            {cumulative.risk_score !== undefined && cumulative.risk_level && (
                                <div>
                                    <p className="text-blue-200 text-xs mb-1">Risk Assessment</p>
                                    <RiskBadge level={cumulative.risk_level} score={cumulative.risk_score} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Table */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Model Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                {['Model', 'Prediction', 'Confidence', 'Latency', 'Calibration Error'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {results.map((r, i) => (
                                <tr key={i} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${r.model === best.model ? 'ring-1 ring-inset ring-blue-400/30' : ''}`}>
                                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                        {r.model === best.model && <span className="mr-2 text-xs text-blue-500">★</span>}
                                        {r.model}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                                        {r.error ? <span className="text-red-500 text-xs">Error: {r.error}</span> : r.output}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {r.error ? '—' : <ConfBar pct={r.confidence} />}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {r.error ? '—' : <LatencyBadge ms={r.latency} />}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {r.error ? '—' : <CalibrationBadge ce={r.calibration_error || 0.15} />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
