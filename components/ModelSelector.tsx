"use client";
import React from 'react';

const MODELS = [
    { id: 'MobileNetV2', label: 'MobileNetV2', desc: 'Efficient · 3.5M params · ~120ms' },
    { id: 'ShuffleNetV2', label: 'ShuffleNetV2', desc: 'Lightweight · channel shuffle · ~90ms' },
    { id: 'EfficientNetB0', label: 'EfficientNetB0', desc: 'Balanced · 5.3M params · ~200ms' },
    { id: 'ResNet50', label: 'ResNet50', desc: 'Robust · 25M params · ~450ms' },
];

interface ModelSelectorProps {
    selectedModels: string[];
    onChange: (models: string[]) => void;
    disabled?: boolean;
}

export default function ModelSelector({ selectedModels, onChange, disabled }: ModelSelectorProps) {
    const toggle = (id: string) => {
        if (selectedModels.includes(id)) {
            if (selectedModels.length === 1) return; // keep at least one
            onChange(selectedModels.filter(m => m !== id));
        } else {
            onChange([...selectedModels, id]);
        }
    };

    const selectAll = () => onChange(MODELS.map(m => m.id));
    const deselectAll = () => onChange([MODELS[0].id]);

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    Select Models
                </label>
                <div className="flex gap-2 text-xs">
                    <button onClick={selectAll} disabled={disabled} className="text-blue-500 hover:text-blue-700 disabled:opacity-40">All</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={deselectAll} disabled={disabled} className="text-slate-400 hover:text-slate-600 disabled:opacity-40">None</button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {MODELS.map(model => {
                    const checked = selectedModels.includes(model.id);
                    return (
                        <label
                            key={model.id}
                            className={`relative flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all select-none
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
                ${checked
                                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
              `}
                        >
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggle(model.id)}
                            />
                            <div className="flex items-start gap-2">
                                <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors
                  ${checked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {checked && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold leading-tight ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {model.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{model.desc}</p>
                                </div>
                            </div>
                        </label>
                    );
                })}
            </div>

            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected · all run in parallel
            </p>
        </div>
    );
}
