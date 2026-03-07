// filepath: apps/superadmin/components/admin/properties/PropertyMediaSection.tsx
// created: 2026-03-01 | creator: Claude Sonnet 4.6
// Photo & document (謄本／權狀／合約／部落格) upload + delete section used inside PropertyEditModal.
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, FileText, Star, ExternalLink, Loader2, Upload } from 'lucide-react';
import {
  getPropertyPhotos,
  getPropertyDocuments,
  uploadPropertyPhoto,
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
};

export type DocumentSectionMode = 'photos' | 'transcript' | 'title' | 'contract' | 'blog';

/** document_type 依分區：謄本 / 權狀(建物+土地) / 合約(租約+買賣) / 部落格 */
const DOC_TYPES_BY_MODE: Record<Exclude<DocumentSectionMode, 'photos'>, string[]> = {
  transcript: ['land_registry_transcript'],
  title: ['building_title', 'land_title'],
  contract: ['lease_contract', 'sales_contract'],
  blog: ['blog'],
};

type DocType =
  | 'land_registry_transcript'
  | 'building_title'
  | 'land_title'
  | 'lease_contract'
  | 'sales_contract'
  | 'blog';

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
};

export function PropertyMediaSection({ propertyId, propertyType, ownerId, mode }: Props) {
  const [activeTab, setActiveTab] = useState<'photos' | 'documents'>(mode === 'photos' || !mode ? 'photos' : 'documents');
  const isPhotoMode = mode === 'photos' || (!mode && activeTab === 'photos');
  const isDocMode = mode === 'documents' || mode === 'transcript' || mode === 'title' || mode === 'contract' || mode === 'blog' || (!mode && activeTab === 'documents');
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
  const uploadDocTypeOptions: DocType[] = docSectionMode ? (DOC_TYPES_BY_MODE[docSectionMode] as DocType[]) : ['land_registry_transcript', 'building_title', 'land_title', 'lease_contract', 'sales_contract', 'blog'];

  // Photo upload state
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

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

  async function handlePhotoUpload() {
    if (!photoFile) return;
    setIsPhotoUploading(true);
    const fd = new FormData();
    fd.append('file', photoFile);
    fd.append('isPrimary', isPrimary ? 'true' : 'false');
    const result = await uploadPropertyPhoto(propertyId, propertyType, fd);
    setIsPhotoUploading(false);
    if (result.success) {
      showFeedback('success', result.message);
      setPhotoFile(null);
      setIsPrimary(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      const updated = await getPropertyPhotos(propertyId);
      setPhotos(updated);
    } else {
      showFeedback('error', result.message);
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-md overflow-hidden border border-border-default bg-bg-tertiary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="property photo" className="w-full h-full object-cover" />
                  {photo.isPrimary && (
                    <span className="absolute top-1 left-1 bg-yellow-500/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" /> 主要
                    </span>
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
              ))}
            </div>
          )}

          {/* Upload new photo */}
          <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
            <p className="text-xs font-medium text-text-secondary">
              新增照片 <span className="text-text-muted font-normal">(JPG / PNG / WebP，最大 10 MB)</span>
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-bg-tertiary file:text-text-secondary hover:file:bg-border-default cursor-pointer"
            />
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-3.5 h-3.5 accent-yellow-500"
              />
              設為主要照片
            </label>
            <button
              type="button"
              onClick={handlePhotoUpload}
              disabled={!photoFile || isPhotoUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {isPhotoUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {isPhotoUploading ? '上傳中…' : '上傳照片'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Documents (謄本／權狀／合約／部落格) ── */
        <div className="space-y-4">
          {displayDocuments.length === 0 ? (
            <p className="text-text-muted text-xs">尚無文件</p>
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
              新增文件 <span className="text-text-muted font-normal">(PDF / JPG / PNG / WebP，最大 20 MB)</span>
            </p>
            <div>
              <label className="block text-xs text-text-muted mb-1">文件類型</label>
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
              {isDocUploading ? '上傳中…' : '上傳文件'}
            </button>
          </div>

          {/* AI 解析謄本 — extracted to TranscriptParseSection */}
          {transcriptDocs.length > 0 && (
            <TranscriptParseSection transcriptDocs={transcriptDocs} />
          )}
        </div>
      )}
    </div>
  );
}

