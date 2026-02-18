"use client";

import React from 'react';

interface ModelSelectorProps {
    selectedModel: string;
    onModelSelect: (model: string) => void;
    disabled?: boolean;
}

const MODELS = [
    { id: 'ResNet50', name: 'ResNet50', description: 'Deep residual learning for image recognition.' },
    { id: 'MobileNetV2', name: 'MobileNetV2', description: 'Efficient model for mobile devices.' },
    { id: 'InceptionV3', name: 'InceptionV3', description: 'Google\'s high-performance architecture.' },
    { id: 'EfficientNetB0', name: 'EfficientNetB0', description: 'Balanced efficiency and accuracy.' },
];

export default function ModelSelector({ selectedModel, onModelSelect, disabled }: ModelSelectorProps) {
    return (
        <div className="w-full max-w-md mx-auto">
            <label htmlFor="model-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Model
            </label>
            <div className="relative">
                <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => onModelSelect(e.target.value)}
                    disabled={disabled}
                    className="appearance-none w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.name}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {MODELS.find(m => m.id === selectedModel)?.description}
            </p>
        </div>
    );
}
