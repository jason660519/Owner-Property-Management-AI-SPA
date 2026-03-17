'use client';

// Page: FP 轉 PDF 功能
// Allows superadmin users to upload FinePrint .fp files and download converted PDFs.

import React, { useCallback, useRef, useState } from 'react';
import JSZip from 'jszip';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { FileUp, Download, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileStatus = 'pending' | 'converting' | 'done' | 'error';

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  errorMsg?: string;
  pdfBlob?: Blob;
  pdfName?: string;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function FpConverterPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- helpers ----

  function updateItem(id: string, patch: Partial<FileItem>) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }

  function addFiles(files: File[]) {
    const fpFiles = files.filter(f => f.name.toLowerCase().endsWith('.fp'));
    if (fpFiles.length === 0) return;
    const newItems: FileItem[] = fpFiles.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: 'pending',
    }));
    setItems(prev => [...prev, ...newItems]);
  }

  // ---- conversion ----

  async function convertOne(item: FileItem) {
    updateItem(item.id, { status: 'converting' });

    const formData = new FormData();
    formData.append('file', item.file);

    try {
      const res = await fetch('/api/fp-converter', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        updateItem(item.id, { status: 'error', errorMsg: json.error ?? '轉換失敗' });
        return;
      }

      const blob = await res.blob();
      const pdfName = item.file.name.replace(/\.fp$/i, '.pdf');
      updateItem(item.id, { status: 'done', pdfBlob: blob, pdfName });
    } catch (err) {
      updateItem(item.id, {
        status: 'error',
        errorMsg: err instanceof Error ? err.message : '網路錯誤',
      });
    }
  }

  function convertAll() {
    const pending = items.filter(it => it.status === 'pending');
    // Convert sequentially to avoid overwhelming the server
    pending.reduce(
      (promise, item) => promise.then(() => convertOne(item)),
      Promise.resolve(),
    );
  }

  function downloadOne(item: FileItem) {
    if (!item.pdfBlob || !item.pdfName) return;
    const url = URL.createObjectURL(item.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.pdfName;
    // Must be in DOM for Firefox/Safari to trigger download reliably
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAll() {
    const doneItems = items.filter(it => it.status === 'done');
    if (doneItems.length === 0) return;

    if (doneItems.length === 1) {
      downloadOne(doneItems[0]);
      return;
    }

    // Bundle all PDFs into a single ZIP to avoid browser blocking multi-downloads
    const zip = new JSZip();
    for (const item of doneItems) {
      if (item.pdfBlob && item.pdfName) {
        const buf = await item.pdfBlob.arrayBuffer();
        zip.file(item.pdfName, buf);
      }
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fp-converted-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id));
  }

  function clearAll() {
    setItems([]);
  }

  // ---- drag & drop ----

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ---- derived state ----

  const hasPending  = items.some(it => it.status === 'pending');
  const hasConverting = items.some(it => it.status === 'converting');
  const hasDone     = items.some(it => it.status === 'done');
  const doneCount   = items.filter(it => it.status === 'done').length;
  const errorCount  = items.filter(it => it.status === 'error').length;

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="FP 轉 PDF 功能"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: 'FP 轉 PDF 功能' },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header card */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} />
              FinePrint .fp 謄本轉 PDF
            </CardTitle>
            <CardDescription>
              上傳一或多個 Windows FinePrint .fp 格式的謄本檔案，系統將自動提取文字並產生可讀的 PDF 檔案。支援臺灣地政謄本（建物標示部、所有權部、他項權利部等）。
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none',
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-border-default hover:border-accent/60 bg-bg-secondary',
          ].join(' ')}
        >
          <FileUp
            size={36}
            className={`mx-auto mb-3 ${isDragging ? 'text-accent' : 'text-text-muted'}`}
          />
          <p className="text-text-primary font-medium">
            拖曳 .fp 檔案至此，或點擊選擇檔案
          </p>
          <p className="text-text-muted text-sm mt-1">
            支援多選，每個檔案上限 5 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".fp"
            className="hidden"
            onChange={e => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
        </div>

        {/* File list */}
        {items.length > 0 && (
          <Card variant="outlined" padding="none">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <span className="text-sm text-text-muted">
                共 {items.length} 個檔案
                {doneCount > 0 && `，${doneCount} 個已完成`}
                {errorCount > 0 && `，${errorCount} 個失敗`}
              </span>
              <div className="flex gap-2">
                {hasDone && (
                  <button
                    onClick={downloadAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    <Download size={14} />
                    全部下載
                  </button>
                )}
                {hasPending && !hasConverting && (
                  <button
                    onClick={convertAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    <FileUp size={14} />
                    開始轉換
                  </button>
                )}
                <button
                  onClick={clearAll}
                  disabled={hasConverting}
                  className="px-3 py-1.5 rounded-lg border border-border-default text-sm text-text-muted hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-40"
                >
                  清除全部
                </button>
              </div>
            </div>

            {/* File rows */}
            <ul className="divide-y divide-border-default">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Status icon */}
                  <div className="shrink-0">
                    {item.status === 'converting' && (
                      <Loader2 size={18} className="text-accent animate-spin" />
                    )}
                    {item.status === 'done' && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <XCircle size={18} className="text-red-500" />
                    )}
                    {item.status === 'pending' && (
                      <FileText size={18} className="text-text-muted" />
                    )}
                  </div>

                  {/* Filename */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate font-medium">
                      {item.file.name}
                    </p>
                    {item.status === 'error' && item.errorMsg && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">
                        {item.errorMsg}
                      </p>
                    )}
                    {item.status === 'pending' && (
                      <p className="text-xs text-text-muted mt-0.5">
                        等待轉換
                      </p>
                    )}
                    {item.status === 'converting' && (
                      <p className="text-xs text-accent mt-0.5">
                        轉換中…
                      </p>
                    )}
                    {item.status === 'done' && (
                      <p className="text-xs text-green-600 mt-0.5">
                        轉換完成 → {item.pdfName}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'done' && (
                      <button
                        onClick={() => downloadOne(item)}
                        title="下載 PDF"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors border border-green-200"
                      >
                        <Download size={13} />
                        下載
                      </button>
                    )}
                    {item.status === 'pending' && !hasConverting && (
                      <button
                        onClick={() => convertOne(item)}
                        title="單獨轉換"
                        className="px-2.5 py-1 rounded-lg border border-border-default text-xs text-text-muted hover:text-accent hover:border-accent transition-colors"
                      >
                        轉換
                      </button>
                    )}
                    {(item.status === 'pending' || item.status === 'error' || item.status === 'done') && (
                      <button
                        onClick={() => removeItem(item.id)}
                        title="移除"
                        className="text-text-muted hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Usage hint */}
        <Card variant="outlined" padding="md">
          <CardContent>
            <p className="text-sm text-text-muted leading-relaxed">
              <strong className="text-text-primary">使用說明：</strong>
              本工具可解析 Windows FinePrint (.fp) 格式謄本，無需 Windows 或 FinePrint 軟體。
              支援臺灣地政謄本（建物標示部、所有權部、抵押權等），輸出為帶有章節結構的 PDF 文件。
              轉換完成後，點擊「下載」即可取得 PDF 檔案。
            </p>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
