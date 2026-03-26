// filepath: apps/superadmin/components/admin/properties/PropertyMediaSection.tsx
// created: 2026-03-01 | creator: Claude Sonnet 4.6
// Photo & document (謄本／權狀／合約／部落格) upload + delete section used inside PropertyEditModal.
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, FileText, Star, ExternalLink, Loader2, Upload } from 'lucide-react';
import {
  getPropertyPhotos,
  getPropertyDocuments,
  createPhotoUploadUrl,
  savePhotoMetadata,
  updatePhotoSortOrder,
  uploadPropertyDocument,
  deletePropertyPhoto,
  deletePropertyDocument,
} from '@/lib/actions/properties';
import type { PropertyPhotoItem, PropertyDocumentItem } from '@/lib/types/properties';
import { TranscriptParseSection } from './TranscriptParseSection';

const DOC_TYPE_LABELS: Record<string, string> = {
  land_registry_transcript: '土地謄本',
  building_registry_transcript: '建物謄本',
  building_title: '建物權狀',
  land_title: '土地權狀',
  lease_contract: '租約',
  sales_contract: '買賣合約',
  blog: '部落格',
  floor_plan: '物件格局圖',
};

export type DocumentSectionMode = 'photos' | 'transcript' | 'title' | 'contract' | 'blog' | 'floor_plan';

/** document_type 依分區：謄本 / 權狀(建物+土地) / 合約(租約+買賣) / 部落格 / 格局圖 */
const DOC_TYPES_BY_MODE: Record<Exclude<DocumentSectionMode, 'photos'>, string[]> = {
  transcript: ['land_registry_transcript'],
  title: ['building_title', 'land_title'],
  contract: ['lease_contract', 'sales_contract'],
  blog: ['blog'],
  floor_plan: ['floor_plan'],
};

type DocType =
  | 'land_registry_transcript'
  | 'building_title'
  | 'land_title'
  | 'lease_contract'
  | 'sales_contract'
  | 'blog'
  | 'floor_plan';

interface Props {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  /** Which section to display. When omitted, renders both with internal tabs (legacy). */
  mode?: DocumentSectionMode | 'documents';
}

const DEFAULT_DOC_TYPE_BY_MODE: Record<Exclude<DocumentSectionMode, 'photos'>, DocType> = {
  transcript: 'land_registry_transcript',
  title: 'building_title',
  contract: 'lease_contract',
  blog: 'blog',
  floor_plan: 'floor_plan',
};

export function PropertyMediaSection({ propertyId, propertyType, ownerId, mode }: Props) {
  const [activeTab, setActiveTab] = useState<'photos' | 'documents'>(mode === 'photos' || !mode ? 'photos' : 'documents');
  const isPhotoMode = mode === 'photos' || (!mode && activeTab === 'photos');
  const isDocMode =
    mode === 'documents' ||
    mode === 'transcript' ||
    mode === 'title' ||
    mode === 'contract' ||
    mode === 'blog' ||
    mode === 'floor_plan' ||
    (!mode && activeTab === 'documents');
  const docSectionMode: Exclude<DocumentSectionMode, 'photos'> | null = mode && mode !== 'photos' && mode !== 'documents' ? mode : null;
  const effectiveTab = mode === 'photos' ? 'photos' : isDocMode ? 'documents' : (mode ?? activeTab);

  const [photos, setPhotos] = useState<PropertyPhotoItem[]>([]);
  const [documents, setDocuments] = useState<PropertyDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Document types allowed in current section (when docSectionMode is set)
  const filteredDocuments = useMemo(() => {
    if (!docSectionMode) return documents;
    const allowed = DOC_TYPES_BY_MODE[docSectionMode];
    return documents.filter((d) => allowed.includes(d.documentType));
  }, [documents, docSectionMode]);
  const defaultDocType = docSectionMode ? DEFAULT_DOC_TYPE_BY_MODE[docSectionMode] : 'land_registry_transcript';
  const uploadDocTypeOptions: DocType[] = docSectionMode
    ? (DOC_TYPES_BY_MODE[docSectionMode] as DocType[])
    : [
        'land_registry_transcript',
        'building_title',
        'land_title',
        'lease_contract',
        'sales_contract',
        'blog',
        'floor_plan',
      ];

  // Photo upload state
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  // Per-file upload progress: index → 0-100
  const [fileProgress, setFileProgress] = useState<Record<number, number>>({});
  const [uploadSummary, setUploadSummary] = useState<{ done: number; total: number } | null>(null);

  // Photo sort-order inline editing state
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Drag-and-drop reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Document upload state (default by section when mode is transcript/title/contract/blog)
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>(defaultDocType);
  const [isDocUploading, setIsDocUploading] = useState(false);

  useEffect(() => {
    if (docSectionMode) setDocType(DEFAULT_DOC_TYPE_BY_MODE[docSectionMode]);
  }, [docSectionMode]);
  const displayDocuments = docSectionMode ? filteredDocuments : documents;

  // AI 解析謄本 — filtered doc list passed to TranscriptParseSection
  const transcriptDocs = useMemo(
    () => displayDocuments.filter((d) => d.documentType === 'land_registry_transcript'),
    [displayDocuments]
  );

  // Load photos & documents on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([getPropertyPhotos(propertyId), getPropertyDocuments(propertyId)])
      .then(([p, d]) => {
        setPhotos(p);
        setDocuments(d);
      })
      .finally(() => setIsLoading(false));
  }, [propertyId]);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  }

  /**
   * Direct-upload flow: browser PUTs each file straight to Supabase Storage
   * via a signed URL, so the file bytes never pass through Next.js.
   * After each successful PUT, a Server Action saves the metadata to the DB.
   */
  async function handlePhotoUpload() {
    if (photoFiles.length === 0) return;
    setIsPhotoUploading(true);
    setFileProgress({});
    setUploadSummary(null);

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      setFileProgress((prev) => ({ ...prev, [i]: 0 }));

      // Step 1: get signed upload URL from server
      const urlResult = await createPhotoUploadUrl(propertyId, file.name);
      if (!urlResult.success || !urlResult.signedUrl || !urlResult.storagePath) {
        errors.push(`第 ${i + 1} 張 (${file.name})：${urlResult.message}`);
        setFileProgress((prev) => ({ ...prev, [i]: -1 }));
        continue;
      }

      // Step 2: PUT directly to Supabase Storage with XHR for progress tracking
      const xhr = new XMLHttpRequest();
      const uploadOk = await new Promise<boolean>((resolve) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setFileProgress((prev) => ({ ...prev, [i]: Math.round((e.loaded / e.total) * 100) }));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFileProgress((prev) => ({ ...prev, [i]: 100 }));
            resolve(true);
          } else {
            setFileProgress((prev) => ({ ...prev, [i]: -1 }));
            resolve(false);
          }
        };
        xhr.onerror = () => { setFileProgress((prev) => ({ ...prev, [i]: -1 })); resolve(false); };
        xhr.open('PUT', urlResult.signedUrl!);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      if (!uploadOk) {
        errors.push(`第 ${i + 1} 張 (${file.name})：Storage 上傳失敗`);
        continue;
      }

      // Step 3: save metadata to DB
      const saveResult = await savePhotoMetadata(propertyId, urlResult.storagePath, false);
      if (!saveResult.success) {
        errors.push(`第 ${i + 1} 張 (${file.name})：${saveResult.message}`);
        setFileProgress((prev) => ({ ...prev, [i]: -1 }));
      } else {
        successCount++;
      }
    }

    setIsPhotoUploading(false);
    setUploadSummary({ done: successCount, total: photoFiles.length });

    if (errors.length > 0) {
      showFeedback('error', errors[0] + (errors.length > 1 ? ` 等 ${errors.length} 個錯誤` : ''));
    }
    if (successCount > 0) {
      showFeedback('success', `已成功上傳 ${successCount} / ${photoFiles.length} 張照片`);
      setPhotoFiles([]);
      setFileProgress({});
      setUploadSummary(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      const updated = await getPropertyPhotos(propertyId);
      setPhotos(updated);
    }
  }

  async function handlePhotoDelete(photo: PropertyPhotoItem) {
    const result = await deletePropertyPhoto(photo.id, photo.storagePath);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      showFeedback('success', '照片已刪除');
    } else {
      showFeedback('error', result.message);
    }
  }

  async function handleDrop(targetPhotoId: string, targetIdx: number) {
    const srcId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!srcId || srcId === targetPhotoId) return;

    const srcIdx = photos.findIndex((p) => p.id === srcId);
    if (srcIdx === -1) return;

    // Optimistic local reorder
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(srcIdx, 1);
    newPhotos.splice(targetIdx, 0, moved);
    setPhotos(newPhotos);

    // Desired 1-based position in the final array
    const targetPosition = targetIdx + 1;
    const result = await updatePhotoSortOrder(propertyId, srcId, targetPosition);
    if (result.success) {
      const updated = await getPropertyPhotos(propertyId);
      setPhotos(updated);
      if (targetPosition === 1) showFeedback('success', '已設為主照片（001）');
    } else {
      showFeedback('error', result.message);
      const reverted = await getPropertyPhotos(propertyId);
      setPhotos(reverted);
    }
  }

  async function handleSortOrderSave(photoId: string) {
    const num = parseInt(editingValue, 10);
    setEditingPhotoId(null);
    if (isNaN(num) || num < 1) return; // invalid → discard

    const result = await updatePhotoSortOrder(propertyId, photoId, num);
    if (result.success) {
      const updated = await getPropertyPhotos(propertyId);
      setPhotos(updated);
      if (num === 1) showFeedback('success', '已設為主照片（001）');
    } else {
      showFeedback('error', result.message);
    }
  }

  async function handleDocUpload() {
    if (!docFile) return;
    setIsDocUploading(true);
    const fd = new FormData();
    fd.append('file', docFile);
    const result = await uploadPropertyDocument(propertyId, propertyType, ownerId, docType, fd);
    setIsDocUploading(false);
    if (result.success) {
      showFeedback('success', result.message);
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = '';
      const updated = await getPropertyDocuments(propertyId);
      setDocuments(updated);
    } else {
      showFeedback('error', result.message);
    }
  }

  async function handleDocDelete(doc: PropertyDocumentItem) {
    const result = await deletePropertyDocument(doc.id, doc.filePath);
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      showFeedback('success', '文件已刪除');
    } else {
      showFeedback('error', result.message);
    }
  }

  return (
    <div className="space-y-3">
      {/* Internal tab headers – only when parent does not pass mode (legacy combined view) */}
      {mode === undefined && (
        <div className="sticky top-0 z-10 -mx-6 px-6 py-0 bg-bg-secondary border-b border-border-default flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'photos'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            物件照片{photos.length > 0 ? ` (${photos.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'documents'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            文件（謄本/權狀/合約/部落格）{documents.length > 0 ? ` (${documents.length})` : ''}
          </button>
        </div>
      )}

      {/* Inline feedback */}
      {feedback && (
        <div
          className={`p-2.5 rounded-md text-xs ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm py-3">
          <Loader2 size={14} className="animate-spin" /> 載入中…
        </div>
      ) : isPhotoMode ? (
        /* ── Photos ── */
        <div className="space-y-4">
          {photos.length === 0 ? (
            <p className="text-text-muted text-xs">尚無照片</p>
          ) : (
            <>
            <p className="text-[11px] text-text-muted -mt-1">
              拖曳照片可調整順序；點擊號碼輸入指定位置，<span className="font-semibold text-yellow-500">001</span> 為主照片
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((photo, idx) => {
                const displayNum = String(idx + 1).padStart(3, '0');
                const isEditing = editingPhotoId === photo.id;
                const isDragging = draggingId === photo.id;
                const isDragOver = dragOverId === photo.id;
                return (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={() => { setDraggingId(photo.id); setEditingPhotoId(null); }}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(photo.id); }}
                    onDragLeave={() => setDragOverId((prev) => prev === photo.id ? null : prev)}
                    onDrop={(e) => { e.preventDefault(); handleDrop(photo.id, idx); }}
                    className={`relative group aspect-square rounded-md overflow-hidden border bg-bg-tertiary cursor-grab active:cursor-grabbing transition-all ${
                      isDragging ? 'opacity-40 scale-95' : 'opacity-100 scale-100'
                    } ${
                      isDragOver && !isDragging
                        ? 'border-accent ring-2 ring-accent/40'
                        : 'border-border-default'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="property photo" className="w-full h-full object-cover" />

                    {/* Editable number badge – bottom-left */}
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleSortOrderSave(photo.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSortOrderSave(photo.id);
                          if (e.key === 'Escape') setEditingPhotoId(null);
                        }}
                        className="absolute bottom-1 left-1 w-14 text-[11px] px-1 py-0.5 rounded bg-white text-black border border-accent outline-none font-mono"
                      />
                    ) : (
                      <button
                        type="button"
                        title={photo.isPrimary ? '主照片（點擊修改排序）' : '點擊修改排序（輸入 001 設為主照片）'}
                        onClick={() => { setEditingPhotoId(photo.id); setEditingValue(String(idx + 1)); }}
                        className={`absolute bottom-1 left-1 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 leading-none cursor-pointer hover:opacity-80 transition-opacity ${
                          photo.isPrimary ? 'bg-yellow-500/90' : 'bg-black/55'
                        }`}
                      >
                        {photo.isPrimary ? (
                          <><Star size={8} fill="currentColor" className="shrink-0" />{displayNum}-主照片</>
                        ) : (
                          displayNum
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePhotoDelete(photo)}
                      className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="刪除照片"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
            </>
          )}

          {/* Upload new photo */}
          <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
            <p className="text-xs font-medium text-text-secondary">
              新增照片 <span className="text-text-muted font-normal">(JPG / PNG / WebP，最大 10 MB)</span>
            </p>
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => { setPhotoFiles(Array.from(e.target.files ?? [])); setFileProgress({}); setUploadSummary(null); }}
              className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-bg-tertiary file:text-text-secondary hover:file:bg-border-default cursor-pointer"
            />

            {/* Per-file progress bars (shown while uploading or after completion) */}
            {photoFiles.length > 0 && Object.keys(fileProgress).length > 0 && (
              <div className="space-y-1.5 mt-1">
                {photoFiles.map((f, i) => {
                  const pct = fileProgress[i] ?? 0;
                  const failed = pct === -1;
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] text-text-muted">
                        <span className="truncate max-w-[60%]">{f.name}</span>
                        <span className={failed ? 'text-red-400' : 'text-text-secondary'}>
                          {failed ? '失敗' : pct === 100 ? '完成 ✓' : `${pct}%`}
                        </span>
                      </div>
                      <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${failed ? 'bg-red-500' : pct === 100 ? 'bg-green-500' : 'bg-accent'}`}
                          style={{ width: `${failed ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {uploadSummary && (
                  <p className="text-xs text-text-muted pt-0.5">
                    完成上傳 {uploadSummary.done} / {uploadSummary.total} 張
                  </p>
                )}
              </div>
            )}

            {photoFiles.length > 0 && Object.keys(fileProgress).length === 0 && (
              <p className="text-xs text-text-muted">
                已選取 {photoFiles.length} 張照片（
                {(photoFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB）
              </p>
            )}

            <button
              type="button"
              onClick={handlePhotoUpload}
              disabled={photoFiles.length === 0 || isPhotoUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {isPhotoUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {isPhotoUploading
                ? `上傳中 ${Object.values(fileProgress).filter((p) => p === 100).length + 1}/${photoFiles.length}…`
                : photoFiles.length > 1
                  ? `上傳 ${photoFiles.length} 張照片`
                  : '上傳照片'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Documents (謄本／權狀／合約／部落格／格局圖) ── */
        <div className="space-y-4">
          {displayDocuments.length === 0 ? (
            <p className="text-text-muted text-xs">
              {docSectionMode === 'floor_plan' ? '尚無格局圖' : '尚無文件'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {displayDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-bg-tertiary border border-border-default"
                >
                  <FileText size={14} className="text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-text-primary">
                      {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </span>
                    <span className="text-xs text-text-muted ml-2 truncate">{doc.documentName}</span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-text-muted hover:text-accent transition-colors"
                    title="開啟文件"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDocDelete(doc)}
                    className="p-1 text-text-muted hover:text-red-500 transition-colors"
                    title="刪除文件"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Upload new document */}
          <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
            <p className="text-xs font-medium text-text-secondary">
              {docSectionMode === 'floor_plan' ? (
                <>
                  上傳格局圖{' '}
                  <span className="text-text-muted font-normal">(PDF / JPG / PNG / WebP，最大 20 MB)</span>
                </>
              ) : (
                <>
                  新增文件{' '}
                  <span className="text-text-muted font-normal">(PDF / JPG / PNG / WebP，最大 20 MB)</span>
                </>
              )}
            </p>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                {docSectionMode === 'floor_plan' ? '檔案類型' : '文件類型'}
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="w-full border border-border-default rounded-md px-2 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent"
              >
                {uploadDocTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
            <input
              ref={docInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-bg-tertiary file:text-text-secondary hover:file:bg-border-default cursor-pointer"
            />
            <button
              type="button"
              onClick={handleDocUpload}
              disabled={!docFile || isDocUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {isDocUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {isDocUploading
                ? '上傳中…'
                : docSectionMode === 'floor_plan'
                  ? '上傳格局圖'
                  : '上傳文件'}
            </button>
          </div>

          {/* AI 解析謄本（目前僅土地謄本） — extracted to TranscriptParseSection */}
          {transcriptDocs.length > 0 && (
            <TranscriptParseSection transcriptDocs={transcriptDocs} kind="land" />
          )}
        </div>
      )}
    </div>
  );
}

