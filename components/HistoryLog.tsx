"use client";

import React from 'react';

interface Result {
    model: string;
    output: string;
    confidence: number;
    latency: number;
    timestamp: Date;
}

interface HistoryLogProps {
    history: Result[];
}

export default function HistoryLog({ history }: HistoryLogProps) {
    if (history.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 px-1">Run History</h3>
            <div className="overflow-hidden bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Result</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Latency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {history.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    {item.timestamp.toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">
                                    {item.model}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                                    {item.output} <span className="text-xs text-slate-400 ml-1">({(item.confidence * 100).toFixed(0)}%)</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-slate-600 dark:text-slate-400">
                                    {item.latency}ms
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
