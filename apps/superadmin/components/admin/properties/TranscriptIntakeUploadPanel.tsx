'use client';

import { useRef, useState } from 'react';
import { ExternalLink, FileText, FileUp, Loader2, Trash2, Upload, X } from 'lucide-react';

import { deletePropertyDocument, uploadPropertyDocument } from '@/lib/actions/properties';
import type { PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';

interface TranscriptIntakeUploadPanelProps {
  property: PropertyItem;
  documents: PropertyDocumentItem[];
  selectedDocumentId?: string | null;
  selectedRunDocumentIds?: string[];
  disabled?: boolean;
  onSelectDocument?: (documentId: string) => void;
  onToggleRunDocument?: (documentId: string, checked: boolean) => void;
  onSelectAllRunDocuments?: (checked: boolean) => void;
  onUploaded: () => Promise<void>;
}

export function TranscriptIntakeUploadPanel({
  property,
  documents,
  selectedDocumentId,
  selectedRunDocumentIds = [],
  disabled,
  onSelectDocument,
  onToggleRunDocument,
  onSelectAllRunDocuments,
  onUploaded,
}: TranscriptIntakeUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const allChecked = documents.length > 0 && selectedRunDocumentIds.length === documents.length;

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setFeedback(null);
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadPropertyDocument(
      property.id,
      property.type,
      property.ownerId,
      'registry_transcript_unclassified',
      formData,
    );
    setIsUploading(false);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await onUploaded();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  }

  async function handleDelete(doc: PropertyDocumentItem) {
    onSelectDocument?.(doc.id);
    if (pendingDeleteDocId !== doc.id) {
      setPendingDeleteDocId(doc.id);
      return;
    }
    setDeletingDocId(doc.id);
    setFeedback(null);
    const result = await deletePropertyDocument(doc.id, doc.filePath);
    setDeletingDocId(null);
    setPendingDeleteDocId(null);
    if (result.success) {
      setFeedback({ type: 'success', message: '謄本文件已刪除' });
      await onUploaded();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3">
      <div className="flex items-center gap-2">
        <FileUp size={15} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">謄本上傳</h3>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        已上傳 {documents.length} 份謄本／權狀；不需先選建物、土地或車位，系統會自動判讀。
      </p>
      {feedback ? (
        <div
          className={`relative mt-3 rounded-md border px-3 py-2 pr-8 text-xs ${
            feedback.type === 'success'
              ? 'border-green-500/25 bg-green-500/10 text-green-600'
              : 'border-red-500/25 bg-red-500/10 text-red-500'
          }`}
        >
          {feedback.message}
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="absolute right-2 top-1.5 rounded p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
            title="關閉提示"
          >
            <X size={12} />
          </button>
        </div>
      ) : null}
      <div className="mt-3 rounded-md border border-dashed border-border-default bg-bg-primary p-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,application/json,image/bmp,image/gif,image/jpeg,image/png,image/tiff,image/webp,text/csv,text/plain"
          disabled={disabled || isUploading}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full text-xs text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-bg-tertiary file:px-2 file:py-1 file:text-xs file:text-text-secondary hover:file:bg-border-default disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || disabled || isUploading}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {isUploading ? '上傳中...' : '上傳謄本'}
        </button>
        <p className="mt-2 text-[11px] text-text-muted">
          支援 PDF、JPG、PNG、GIF、WebP、TIFF、BMP、JSON、TXT、CSV，單檔上限 20 MB。
        </p>
      </div>

      {documents.length ? (
        <div className="mt-3 rounded-md border border-border-default bg-bg-primary">
          <div className="border-b border-border-default px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-text-secondary">已上傳謄本／權狀</p>
                <p className="mt-1 text-[11px] text-text-muted">
                  已勾選 {selectedRunDocumentIds.length} 份解析；點檔名可切換右側預覽。
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectAllRunDocuments?.(!allChecked)}
                disabled={disabled}
                className="rounded border border-border-default px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
              >
                {allChecked ? '全不勾選' : '全選'}
              </button>
            </div>
          </div>
          <ul className="space-y-1.5 p-2">
            {documents.map((doc) => {
              const isChecked = selectedRunDocumentIds.includes(doc.id);
              const isSelected = isChecked && selectedDocumentId === doc.id;
              const isPendingDelete = pendingDeleteDocId === doc.id;
              const isDeleting = deletingDocId === doc.id;
              return (
                <li
                  key={doc.id}
                  className={`flex items-center gap-2 rounded-md border px-2 py-2 transition ${
                    isSelected
                      ? 'border-accent/60 bg-accent/10 shadow-sm ring-2 ring-accent/20'
                      : 'border-border-default bg-bg-primary hover:bg-bg-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={(event) => onToggleRunDocument?.(doc.id, event.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-border-default text-accent focus:ring-accent"
                    aria-label={`納入解析 ${doc.documentName}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDocument?.(doc.id);
                      setPendingDeleteDocId(null);
                    }}
                    disabled={!isChecked}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-55"
                    aria-label={`預覽 ${doc.documentName}`}
                  >
                    <FileText size={14} className={`shrink-0 ${isChecked ? 'text-accent' : 'text-text-muted'}`} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">
                      {doc.documentName}
                    </span>
                    {isChecked ? (
                      <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        預覽中
                      </span>
                    ) : null}
                  </button>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-accent"
                    title="開啟文件"
                  >
                    <ExternalLink size={13} />
                  </a>
                  {isPendingDelete ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(doc)}
                      disabled={disabled || isDeleting}
                      className="inline-flex h-7 items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 text-[11px] font-medium text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      確認刪除
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleDelete(doc)}
                      disabled={disabled || Boolean(deletingDocId)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                      title="刪除文件"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {pendingDeleteDocId ? (
            <div className="border-t border-border-default px-3 py-2">
              <button
                type="button"
                onClick={() => setPendingDeleteDocId(null)}
                className="text-[11px] text-text-muted hover:text-text-primary"
              >
                取消刪除
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
