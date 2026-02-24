"use client";
import React, { useEffect, useState } from 'react';

interface ModelSpec {
    name: string;
    type: string;
    params: string;
    memory: string;
    latency_avg: number;
    accuracy: number;
    calibration_error: number;
}

interface ModelSpecsTableProps {
    selectedModels?: string[];
}

function CalibrationBadge({ ce }: { ce: number }) {
    // Color based on calibration error: EC < 0.2 = Green, 0.2-0.5 = Yellow, > 0.5 = Red
    let color = 'bg-green-50 text-green-700';
    if (ce >= 0.5) {
        color = 'bg-red-50 text-red-700';
    } else if (ce >= 0.2) {
        color = 'bg-yellow-50 text-yellow-700';
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            {(ce * 100).toFixed(1)}%
        </span>
    );
}

export default function ModelSpecsTable({ selectedModels = [] }: ModelSpecsTableProps) {
    const [specs, setSpecs] = useState<ModelSpec[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSpecs = async () => {
            try {
                const res = await fetch('/api/model-specs');
                if (res.ok) {
                    const data = await res.json();
                    setSpecs(data.specs || []);
                } else {
                    console.error('Failed to fetch model specs');
                }
            } catch (err) {
                console.error('Error fetching model specs:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSpecs();
    }, []);

    if (loading) {
        return (
            <div className="w-full p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm text-slate-500">Loading model specs...</span>
                </div>
            </div>
        );
    }

    if (!specs.length) return null;

    // Filter to selected models if provided
    const displaySpecs = selectedModels.length > 0
        ? specs.filter(s => selectedModels.includes(s.name))
        : specs;

    return (
        <div className="w-full rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    Model Specifications
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            {[
                                'Model',
                                'Type',
                                'Parameters',
                                'Memory',
                                'Avg Latency',
                                'Accuracy',
                                'Calibration Error',
                            ].map(h => (
                                <th
                                    key={h}
                                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {displaySpecs.map((spec, i) => (
                            <tr key={i} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    {spec.name}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                        {spec.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                    {spec.params}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                    {spec.memory}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
                                        {spec.latency_avg} ms
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                                        {(spec.accuracy * 100).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <CalibrationBadge ce={spec.calibration_error} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                <p>
                    <strong className="text-slate-700 dark:text-slate-300">Calibration Error:</strong> Lower is better.
                    <span className="ml-2 inline-block px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        Green: &lt;20%
                    </span>
                    <span className="ml-1 inline-block px-2 py-0.5 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                        Yellow: 20-50%
                    </span>
                    <span className="ml-1 inline-block px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                        Red: &gt;50%
                    </span>
                </p>
            </div>
        </div>
    );
}
