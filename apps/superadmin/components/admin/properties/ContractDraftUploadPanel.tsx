'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Eye, EyeOff, FileUp, Loader2, Trash2 } from 'lucide-react';
import type { PropertyItem } from '@/lib/types/properties';
import type { PropertyContractFileItem } from '@/lib/types/properties';
import { uploadContractFile, getPropertyContractFiles, deletePropertyDocument } from '@/lib/actions/properties';
import type { ContractTemplateId } from './ContractTemplateConfig';

interface Props {
  property: PropertyItem;
  contractType: 'lease' | 'sale';
  templateId: ContractTemplateId;
  templateLabel: string;
}

const BTN_ICON = 'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors';

export function ContractDraftUploadPanel({ property, contractType, templateId, templateLabel }: Props) {
  const documentType = contractType === 'lease' ? 'lease_contract' as const : 'sales_contract' as const;

  const [files, setFiles] = useState<PropertyContractFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id, templateId]);

  async function loadFiles() {
    setLoading(true);
    setError(null);
    try {
      const docs = await getPropertyContractFiles(property.id, documentType, templateId);
      setFiles(docs);
    } catch {
      setError('載入合約清單失敗');
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadContractFile(
        property.id,
        property.type === 'sale' ? 'sale' : 'rental',
        property.ownerId,
        documentType,
        templateId,
        templateLabel,
        formData,
      );
      if (!result.success) throw new Error(result.message);
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  async function handleDelete(docId: string, filePath: string) {
    setError(null);
    try {
      const result = await deletePropertyDocument(docId, filePath);
      if (!result.success) throw new Error(result.message);
      setFiles(prev => prev.filter(f => f.id !== docId));
      if (previewId === docId) setPreviewId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗');
    }
  }

  const previewFile = files.find(f => f.id === previewId);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={[
          'rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border-default bg-bg-secondary/30 hover:border-accent hover:bg-accent/5',
        ].join(' ')}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-text-secondary">上傳中，請稍候...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileUp className="h-8 w-8 text-text-muted" />
            <p className="text-sm font-medium text-text-primary">點擊或拖曳上傳合約文件</p>
            <p className="text-xs text-text-muted">支援 PDF、DOCX、DOC、JPG、PNG（最大 20MB）</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* File list */}
      {loading ? (
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">載入中...</span>
        </div>
      ) : files.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">尚無已上傳的合約文件，請於上方上傳。</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const isPdf = file.mimeType === 'application/pdf';
            const isPreviewing = previewId === file.id;
            return (
              <div key={file.id} className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-primary px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text-primary">{file.documentName}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{file.createdAt}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isPdf && (
                    <button
                      type="button"
                      onClick={() => setPreviewId(isPreviewing ? null : file.id)}
                      className={BTN_ICON}
                      title={isPreviewing ? '關閉預覽' : '預覽 PDF'}
                    >
                      {isPreviewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                  <a
                    href={file.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BTN_ICON}
                    title="下載"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleDelete(file.id, file.filePath)}
                    className={`${BTN_ICON} text-red-500 border-red-200 hover:bg-red-50`}
                    title="刪除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF inline preview */}
      {previewFile && (
        <div className="rounded-xl border border-border-default overflow-hidden">
          <iframe
            src={previewFile.viewUrl}
            className="w-full bg-white"
            style={{ height: '700px' }}
            title={`合約預覽：${previewFile.documentName}`}
          />
        </div>
      )}
    </div>
  );
}
