'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  // Use a local worker if possible, or a matching CDN version.
  // Since we installed pdfjs-dist ^5.4.624, we should use that version.
  // However, dynamically importing from node_modules in Next.js client-side can be tricky without proper config.
  // A safer bet for now is using the CDN with the exact version.
  // Using unpkg as cdnjs might not have the latest version immediately.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
}

interface FileStatus {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  result?: any;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf']
};

export function SystemPromptFileUpload() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate preview
  const generatePreview = async (file: File): Promise<string | undefined> => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    } else if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Scale to fit 150x150 roughly
        const scale = Math.min(150 / viewport.width, 150 / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        if (context) {
          await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
          return canvas.toDataURL();
        }
      } catch (e) {
        console.error("PDF Preview generation failed", e);
        return undefined;
      }
    }
    return undefined;
  };

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setErrorMsg(null);
    
    // Handle rejections
    if (fileRejections.length > 0) {
      const errors = fileRejections.map(r => {
        if (r.errors[0].code === 'file-too-large') return `${r.file.name}: 檔案超過 10MB`;
        if (r.errors[0].code === 'file-invalid-type') return `${r.file.name}: 格式不支援`;
        return `${r.file.name}: ${r.errors[0].message}`;
      });
      setErrorMsg(errors.join('\n'));
    }

    if (files.length + acceptedFiles.length > MAX_FILES) {
      setErrorMsg(`一次最多只能上傳 ${MAX_FILES} 個檔案`);
      return;
    }

    const newFiles: FileStatus[] = await Promise.all(acceptedFiles.map(async (f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      preview: await generatePreview(f),
      status: 'pending',
      progress: 0
    })));

    setFiles(prev => [...prev, ...newFiles]);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setGlobalStatus('uploading');
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading', progress: 0 })));

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f.file);
    });

    try {
      // Use direct URL for now, can be configured via env
      const res = await fetch('http://localhost:8000/api/v1/ocr/batch-upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setBatchId(data.batch_id);
      setGlobalStatus('processing');
      setFiles(prev => prev.map(f => ({ ...f, status: 'processing' })));
    } catch (e: any) {
      console.error("Upload failed", e);
      setGlobalStatus('error');
      setErrorMsg(e.message || '上傳失敗，請檢查網路連線或後端伺服器狀態');
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', message: e.message || '上傳失敗' })));
    }
  };

  // SSE Effect
  useEffect(() => {
    if (!batchId || globalStatus !== 'processing') return;

    const eventSource = new EventSource(`http://localhost:8000/api/v1/ocr/events/${batchId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'FILE_PROCESSING') {
           setFiles(prev => prev.map((f, i) => 
             i === data.index ? { ...f, status: 'processing', progress: data.progress } : f
           ));
        } else if (data.type === 'FILE_COMPLETED') {
           setFiles(prev => {
             const newFiles = [...prev];
             // Match by filename as fallback
             const idx = newFiles.findIndex(f => f.file.name === data.filename);
             if (idx !== -1) {
               newFiles[idx] = { ...newFiles[idx], status: 'completed', progress: 100, result: data.result };
             }
             return newFiles;
           });
        } else if (data.type === 'FILE_FAILED') {
           setFiles(prev => {
             const newFiles = [...prev];
             const idx = newFiles.findIndex(f => f.file.name === data.filename);
             if (idx !== -1) {
               newFiles[idx] = { ...newFiles[idx], status: 'error', message: data.error };
             }
             return newFiles;
           });
        } else if (data.type === 'BATCH_COMPLETED') {
           setGlobalStatus('completed');
           eventSource.close();
        } else if (data.type === 'BATCH_FAILED') {
           setGlobalStatus('error');
           setErrorMsg(data.error);
           eventSource.close();
        }
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    eventSource.onerror = (e) => {
      console.error("SSE Error", e);
      if (eventSource.readyState === EventSource.CLOSED) {
          setGlobalStatus('error');
          setErrorMsg("連線中斷");
      }
    };

    return () => {
      eventSource.close();
    };
  }, [batchId, globalStatus]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-bg-secondary/30">
        <h3 className="text-sm font-medium text-text-primary">測試區：檔案上傳與 OCR 解析</h3>
        
        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={clsx(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
            isDragActive ? "border-accent bg-accent/5" : "border-border-default hover:border-accent/50",
            (globalStatus === 'uploading' || globalStatus === 'processing') && "pointer-events-none opacity-50"
          )}
          role="button"
          aria-label="File upload dropzone"
          tabIndex={0}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-8 w-8 text-text-muted mb-3" />
          <p className="text-sm text-text-primary font-medium">拖放檔案至此，或點擊選取</p>
          <p className="text-xs text-text-secondary mt-1">
            支援 PDF, JPG, PNG, TIFF, BMP, GIF (單檔 &le; 10MB)
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-md flex items-start gap-2 whitespace-pre-wrap">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.map((file, idx) => (
                    <div key={file.id} className="relative group border border-border-default rounded-md overflow-hidden bg-bg-primary">
                        {/* Preview */}
                        <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                            {file.preview ? (
                                <img src={file.preview} alt={file.file.name} className="object-cover w-full h-full" />
                            ) : (
                                <FileText className="text-gray-400 h-10 w-10" />
                            )}
                            
                            {/* Overlay for status */}
                            {file.status !== 'pending' && file.status !== 'completed' && file.status !== 'error' && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center flex-col text-white text-xs">
                                    <Loader2 className="animate-spin mb-1" size={20} />
                                    {Math.round(file.progress)}%
                                </div>
                            )}
                            
                            {file.status === 'completed' && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="text-green-500" size={24} />
                                </div>
                            )}

                             {file.status === 'error' && (
                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                    <X className="text-red-500" size={24} />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-2 text-xs">
                            <div className="truncate font-medium text-text-primary" title={file.file.name}>{file.file.name}</div>
                            <div className="flex justify-between text-text-muted mt-1">
                                <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <span className={clsx(
                                    file.status === 'completed' && "text-green-500",
                                    file.status === 'error' && "text-red-500"
                                )}>
                                    {file.status === 'pending' && '待上傳'}
                                    {file.status === 'uploading' && '上傳中...'}
                                    {file.status === 'processing' && '解析中...'}
                                    {file.status === 'completed' && '完成'}
                                    {file.status === 'error' && '失敗'}
                                </span>
                            </div>
                        </div>

                        {/* Remove Button (only when pending) */}
                        {file.status === 'pending' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove file"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* Actions */}
        {files.length > 0 && (
            <div className="flex justify-end gap-3 pt-2">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setFiles([]); setGlobalStatus('idle'); setBatchId(null); setErrorMsg(null); }}
                    disabled={globalStatus === 'uploading' || globalStatus === 'processing'}
                 >
                    清空列表
                 </Button>
                 
                 {globalStatus === 'idle' || globalStatus === 'error' || globalStatus === 'completed' ? (
                     <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleUpload}
                        isLoading={globalStatus === 'uploading'}
                        disabled={globalStatus === 'completed'}
                     >
                        {globalStatus === 'error' ? '重試上傳' : '開始上傳與解析'}
                     </Button>
                 ) : (
                    <Button variant="secondary" size="sm" disabled>
                        <Loader2 className="animate-spin mr-2" size={14} />
                        處理中...
                    </Button>
                 )}
            </div>
        )}
    </div>
  );
}
