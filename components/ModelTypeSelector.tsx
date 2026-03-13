"use client";
import React from 'react';

const MODEL_TYPES = [
  { id: 'histology', label: 'Histology Classification', desc: 'Predict tissue type' },
  { id: 'segmentation', label: 'Tumor Segmentation', desc: 'Pixel-level masks' },
];

interface ModelTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
  disabled?: boolean;
}

export default function ModelTypeSelector({ selectedType, onChange, disabled }: ModelTypeSelectorProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 block">
        Model Category
      </label>

      <div className="grid grid-cols-3 gap-3">
        {MODEL_TYPES.map(type => {
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              disabled={disabled}
              className={`relative flex flex-col p-4 rounded-lg border-2 transition-all select-none
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
                ${isSelected
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
              `}
            >
              <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                {type.label}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">{type.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
