"use client";

import React from 'react';

interface Result {
    model: string;
    output: string;
    confidence: number;
    latency: number;
}

interface ResultsDisplayProps {
    result: Result | null;
    loading: boolean;
}

export default function ResultsDisplay({ result, loading }: ResultsDisplayProps) {
    if (loading) {
        return (
            <div className="w-full max-w-md mx-auto mt-6 p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center min-h-[160px]">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin-slow mb-4"></div>
                <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">Running Inference...</p>
            </div>
        );
    }

    if (!result) return null;

    return (
        <div className="w-full max-w-md mx-auto mt-6 p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 animate-fade-in ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                    Result
                </h3>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold uppercase tracking-wider rounded-full">
                    Success
                </span>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide font-medium text-[10px]">Classification</p>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        {result.output}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide font-medium text-[10px]">Confidence</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {(result.confidence * 100).toFixed(1)}%
                            </span>
                            <div className="h-2 flex-grow bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${result.confidence * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide font-medium text-[10px]">Latency</p>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            {result.latency}
                            <span className="text-xs text-slate-400 font-normal">ms</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
