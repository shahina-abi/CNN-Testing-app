"use client";

import React, { useState, useRef } from 'react';

interface ImageUploadProps {
    onImageSelect: (file: File) => void;
    onZipSelect?: (file: File) => void;
    isBatchMode?: boolean;
}

export default function ImageUpload({ onImageSelect, onZipSelect, isBatchMode = false }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        if (isBatchMode) {
            // Batch mode: accept ZIP files
            if (!file.name.toLowerCase().endsWith('.zip')) {
                alert('Please upload a ZIP file.');
                return;
            }
            if (onZipSelect) {
                onZipSelect(file);
                setPreview(`📦 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            }
        } else {
            // Single mode: accept image files
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            onImageSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out cursor-pointer group 
          ${isDragOver
                        ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={isBatchMode ? '.zip' : 'image/*'}
                    className="hidden"
                />

                {preview ? (
                    <div className="relative w-full rounded-lg overflow-hidden shadow-sm animate-fade-in group-hover:opacity-90 transition-opacity">
                        {isBatchMode ? (
                            <div className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-6 rounded-lg flex items-center justify-center min-h-[120px]">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">📦</div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{preview}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ready to process</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-sm">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-medium bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                                        Change Image
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300">
                            {isBatchMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            {isBatchMode ? 'Click to upload or drag and drop a ZIP file' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isBatchMode ? 'ZIP archive with images (.png, .jpg, .jpeg)' : 'SVG, PNG, JPG or GIF (max. 800x400px)'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
