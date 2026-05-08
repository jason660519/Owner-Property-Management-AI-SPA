// filepath: apps/superadmin/components/admin/properties/PropertyMediaSection.tsx
// created: 2026-03-01 | creator: Claude Sonnet 4.6
// Photo & document (謄本／權狀／合約／部落格) upload + delete section used inside PropertyEditModal.
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, FileText, Star, ExternalLink, Loader2, Upload, X } from 'lucide-react';
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
import { generateManualTransactionComparableDocument } from '@/lib/actions/transaction-comparables';
import type { PropertyPhotoItem, PropertyDocumentItem } from '@/lib/types/properties';
import { TranscriptParseSection } from './TranscriptParseSection';
import { FloorPlanAIStudio } from './FloorPlanAIStudio';
import {
  clearPendingComparable,
  clearTransactionComparablesFeedback,
  elapsedSecondsForComparable,
  pendingComparableKindsList,
  readTransactionComparablesFeedback,
  writePendingComparable,
  writeTransactionComparablesFeedback,
  type TransactionComparableKind,
} from './transaction-comparables-pending-storage';

const DOC_TYPE_LABELS: Record<string, string> = {
  land_registry_transcript: '土地謄本',
  building_registry_transcript: '建物謄本',
  building_title: '建物權狀',
  land_title: '土地權狀',
  lease_contract: '租約',
  sales_contract: '買賣合約',
  blog: '部落格',
  floor_plan: '格局圖',
  building_measurement_survey: '建物測量成果圖',
  transaction_comparables: '成交行情表',
  transaction_comparables_nearby: '附近成交價',
  transaction_comparables_street_section: '同街段成交價',
};

export type DocumentSectionMode =
  | 'photos'
  | 'transcript'
  | 'title'
  | 'contract'
  | 'blog'
  | 'floor_plan'
  | 'building_measurement_survey'
  | 'transaction_comparables';

type VisualPlanSectionMode = 'floor_plan' | 'building_measurement_survey' | 'transaction_comparables';

function isVisualPlanSection(
  mode: DocumentSectionMode | undefined,
): mode is VisualPlanSectionMode {
  return (
    mode === 'floor_plan' ||
    mode === 'building_measurement_survey' ||
    mode === 'transaction_comparables'
  );
}

function visualPlanCopy(mode: VisualPlanSectionMode) {
  if (mode === 'transaction_comparables') {
    return {
      empty: '尚無成交行情表',
      uploadLead: '上傳成交行情表',
      uploadBtn: '上傳成交行情表',
      fileTypeLabel: '檔案類型',
      badgeEn: 'Comparables',
      docImageAlt: (name: string) => `成交行情表預覽：${name}`,
      docPdfTitle: (name: string) => `成交行情表 PDF 預覽：${name}`,
      latestNote: '已完成上傳，這是最新一份成交行情表。',
      pendingImageAlt: '待上傳成交行情表預覽',
      pendingPdfTitle: '待上傳成交行情表 PDF 預覽',
    };
  }
  if (mode === 'building_measurement_survey') {
    return {
      empty: '尚無建物測量成果圖',
      uploadLead: '上傳建物測量成果圖',
      uploadBtn: '上傳建物測量成果圖',
      fileTypeLabel: '檔案類型',
      badgeEn: 'Building survey',
      docImageAlt: (name: string) => `建物測量成果圖預覽：${name}`,
      docPdfTitle: (name: string) => `建物測量成果圖 PDF 預覽：${name}`,
      latestNote: '已完成上傳，這是最新一份建物測量成果圖。',
      pendingImageAlt: '待上傳建物測量成果圖預覽',
      pendingPdfTitle: '待上傳建物測量成果圖 PDF 預覽',
    };
  }
  return {
    empty: '尚無格局圖',
    uploadLead: '上傳格局圖',
    uploadBtn: '上傳格局圖',
    fileTypeLabel: '檔案類型',
    badgeEn: 'Floor Plan',
    docImageAlt: (name: string) => `格局圖預覽：${name}`,
    docPdfTitle: (name: string) => `格局圖 PDF 預覽：${name}`,
    latestNote: '已完成上傳，這是最新一張格局圖。',
    pendingImageAlt: '待上傳格局圖預覽',
    pendingPdfTitle: '待上傳格局圖 PDF 預覽',
  };
}

/** document_type 依分區：謄本 / 權狀(建物+土地) / 合約(租約+買賣) / 部落格 / 格局圖 / 建物測量成果圖 / 成交行情表 */
const DOC_TYPES_BY_MODE: Record<Exclude<DocumentSectionMode, 'photos'>, string[]> = {
  transcript: ['land_registry_transcript'],
  title: ['building_title', 'land_title'],
  contract: ['lease_contract', 'sales_contract'],
  blog: ['blog'],
  floor_plan: ['floor_plan'],
  building_measurement_survey: ['building_measurement_survey'],
  transaction_comparables: [
    'transaction_comparables',
    'transaction_comparables_nearby',
    'transaction_comparables_street_section',
  ],
};

const MANUAL_RADIUS_OPTIONS = [0.5, 1, 2, 3, 5] as const;
const MANUAL_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

function initialManualDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  return {
    startRocYear: String(start.getFullYear() - 1911),
    startMonth: String(start.getMonth() + 1).padStart(2, '0'),
    endRocYear: String(now.getFullYear() - 1911),
    endMonth: String(now.getMonth() + 1).padStart(2, '0'),
  };
}

function rocYearMonthToIso(rocYear: string, month: string): string {
  return `${Number(rocYear) + 1911}-${month}`;
}

type DocType =
  | 'land_registry_transcript'
  | 'building_title'
  | 'land_title'
  | 'lease_contract'
  | 'sales_contract'
  | 'blog'
  | 'floor_plan'
  | 'building_measurement_survey'
  | 'transaction_comparables'
  | 'transaction_comparables_nearby'
  | 'transaction_comparables_street_section';

interface Props {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  /** Which section to display. When omitted, renders both with internal tabs (legacy). */
  mode?: DocumentSectionMode | 'documents';
}

function isImagePreviewable(value: string) {
  return /\.(png|jpe?g|webp)$/i.test(value);
}

function isPdfPreviewable(value: string) {
  return /\.pdf$/i.test(value);
}

function isAiGeneratedDocument(doc: PropertyDocumentItem): boolean {
  return doc.tags?.includes('ai_generated') === true;
}

function metadataString(doc: PropertyDocumentItem, key: string): string | null {
  const value = doc.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function aiGeneratedModelLabel(doc: PropertyDocumentItem): string | null {
  const provider = metadataString(doc, 'provider');
  const modelId = metadataString(doc, 'model_id');
  if (provider && modelId) return `${provider} / ${modelId}`;

  const modelTag = doc.tags?.find((tag) => tag.startsWith('model:'));
  if (!modelTag) return null;
  const [, tagProvider, ...modelParts] = modelTag.split(':');
  if (!tagProvider || modelParts.length === 0) return null;
  return `${tagProvider} / ${modelParts.join(':')}`;
}

const DEFAULT_DOC_TYPE_BY_MODE: Record<Exclude<DocumentSectionMode, 'photos'>, DocType> = {
  transcript: 'land_registry_transcript',
  title: 'building_title',
  contract: 'lease_contract',
  blog: 'blog',
  floor_plan: 'floor_plan',
  building_measurement_survey: 'building_measurement_survey',
  transaction_comparables: 'transaction_comparables',
};

export function PropertyMediaSection({ propertyId, propertyType, ownerId, mode }: Props) {
  const [activeTab, setActiveTab] = useState<'photos' | 'documents'>(mode === 'photos' || !mode ? 'photos' : 'documents');
  const isPhotoMode = mode === 'photos' || (!mode && activeTab === 'photos');
  const docSectionMode: Exclude<DocumentSectionMode, 'photos'> | null = mode && mode !== 'photos' && mode !== 'documents' ? mode : null;

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
        'building_measurement_survey',
        'transaction_comparables',
        'transaction_comparables_nearby',
        'transaction_comparables_street_section',
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
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [latestUploadedDocId, setLatestUploadedDocId] = useState<string | null>(null);

  // Transaction Comparables states
  const [isGeneratingNearby, setIsGeneratingNearby] = useState(false);
  const [isGeneratingStreet, setIsGeneratingStreet] = useState(false);
  const [pendingComparableKinds, setPendingComparableKinds] = useState<TransactionComparableKind[]>([]);
  const [comparableElapsedTick, setComparableElapsedTick] = useState(0);
  const hadPendingComparablesRef = useRef(false);
  const manualInitialDatesRef = useRef(initialManualDateRange());
  const [manualMode, setManualMode] = useState<'nearby' | 'street_section'>('nearby');
  const [manualRadiusKm, setManualRadiusKm] = useState('1');
  const [manualAddressKeyword, setManualAddressKeyword] = useState('');
  const [manualStreet, setManualStreet] = useState('');
  const [manualLandSection, setManualLandSection] = useState('');
  const [manualStartRocYear, setManualStartRocYear] = useState(manualInitialDatesRef.current.startRocYear);
  const [manualStartMonth, setManualStartMonth] = useState(manualInitialDatesRef.current.startMonth);
  const [manualEndRocYear, setManualEndRocYear] = useState(manualInitialDatesRef.current.endRocYear);
  const [manualEndMonth, setManualEndMonth] = useState(manualInitialDatesRef.current.endMonth);

  useEffect(() => {
    if (docSectionMode) {
      setDocType(DEFAULT_DOC_TYPE_BY_MODE[docSectionMode]);
    }
  }, [docSectionMode]);

  useEffect(() => {
    if (!docSectionMode || !isVisualPlanSection(docSectionMode as VisualPlanSectionMode) || !docFile) {
      setDocPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(docFile);
    setDocPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return nextPreviewUrl;
    });

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [docFile, docSectionMode]);
  const displayDocuments = docSectionMode ? filteredDocuments : documents;
  const displayAiGeneratedDocuments = docSectionMode === 'floor_plan'
    ? displayDocuments.filter(isAiGeneratedDocument)
    : [];
  const displayPreviewDocuments = docSectionMode === 'floor_plan'
    ? displayDocuments.filter((doc) => !isAiGeneratedDocument(doc))
    : displayDocuments;
  const visualUploadCopy = docSectionMode && isVisualPlanSection(docSectionMode as unknown as DocumentSectionMode) ? visualPlanCopy(docSectionMode as unknown as VisualPlanSectionMode) : null;
  const comparableElapsedRefreshKey = `${propertyId}:${comparableElapsedTick}:${pendingComparableKinds.join('|')}`;
  const nearbyComparableElapsed = elapsedSecondsForComparable(propertyId, 'nearby');
  const streetComparableElapsed = elapsedSecondsForComparable(propertyId, 'street_section');
  void comparableElapsedRefreshKey;
  const maxComparableElapsed = Math.max(nearbyComparableElapsed, streetComparableElapsed);
  const isNearbyComparablePending = isGeneratingNearby || pendingComparableKinds.includes('nearby');
  const isStreetComparablePending = isGeneratingStreet || pendingComparableKinds.includes('street_section');
  const isManualComparablePending = isNearbyComparablePending || isStreetComparablePending;
  const currentRocYear = new Date().getFullYear() - 1911;
  const manualYearOptions = useMemo(
    () => Array.from({ length: 8 }, (_, index) => String(currentRocYear - index)),
    [currentRocYear],
  );

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

  useEffect(() => {
    if (docSectionMode !== 'transaction_comparables') return;

    const storedFeedback = readTransactionComparablesFeedback(propertyId);
    if (storedFeedback) {
      setFeedback({ type: storedFeedback.type, message: storedFeedback.message });
    }

    const sync = () => {
      const next = pendingComparableKindsList(propertyId);
      const hadPending = hadPendingComparablesRef.current;
      hadPendingComparablesRef.current = next.length > 0;
      setPendingComparableKinds(next);

      if (hadPending && next.length === 0) {
        void getPropertyDocuments(propertyId).then(setDocuments);
      }
    };

    sync();
    const id = window.setInterval(sync, 500);
    return () => window.clearInterval(id);
  }, [docSectionMode, propertyId]);

  useEffect(() => {
    if (pendingComparableKinds.length === 0) return;
    const id = window.setInterval(() => setComparableElapsedTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(id);
  }, [pendingComparableKinds.length]);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    if (docSectionMode === 'transaction_comparables') {
      writeTransactionComparablesFeedback(propertyId, { type, message });
    }
    // 移除自動消失邏輯，讓使用者有足夠時間閱讀，需手動點擊 X 關閉
  }

  function clearFeedback() {
    setFeedback(null);
    if (docSectionMode === 'transaction_comparables') {
      clearTransactionComparablesFeedback(propertyId);
    }
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

  function resetManualComparableQuery() {
    const defaults = manualInitialDatesRef.current;
    setManualMode('nearby');
    setManualRadiusKm('1');
    setManualAddressKeyword('');
    setManualStreet('');
    setManualLandSection('');
    setManualStartRocYear(defaults.startRocYear);
    setManualStartMonth(defaults.startMonth);
    setManualEndRocYear(defaults.endRocYear);
    setManualEndMonth(defaults.endMonth);
  }

  async function handleManualComparableSearch() {
    if (propertyType !== 'sale') return;
    const kind: TransactionComparableKind = manualMode === 'nearby' ? 'nearby' : 'street_section';
    writePendingComparable(propertyId, kind, Date.now());
    if (manualMode === 'nearby') {
      setIsGeneratingNearby(true);
    } else {
      setIsGeneratingStreet(true);
    }
    setFeedback(null);
    try {
      const result = await generateManualTransactionComparableDocument(propertyId, {
        mode: manualMode,
        radiusKm: Number(manualRadiusKm),
        addressKeyword: manualAddressKeyword.trim(),
        street: manualStreet.trim(),
        landSection: manualLandSection.trim(),
        startYearMonth: rocYearMonthToIso(manualStartRocYear, manualStartMonth),
        endYearMonth: rocYearMonthToIso(manualEndRocYear, manualEndMonth),
      });
      if (result.success) {
        const extra = result.notes?.length ? ` ${result.notes.join(' ')}` : '';
        showFeedback('success', `${result.message}，已儲存到資料庫，重新整理後仍會保留。${extra}`);
        const updated = await getPropertyDocuments(propertyId);
        setDocuments(updated);
      } else {
        showFeedback('error', result.message);
      }
    } finally {
      clearPendingComparable(propertyId, kind);
      if (manualMode === 'nearby') {
        setIsGeneratingNearby(false);
      } else {
        setIsGeneratingStreet(false);
      }
    }
  }

  const transactionComparableManualQueryPanel =
    docSectionMode === 'transaction_comparables' && propertyType === 'sale' ? (
      <div className="rounded-lg border border-border-default bg-bg-secondary/60 px-4 py-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-text-secondary">手動查詢成交行情</p>
          <span className="text-[10px] text-text-muted">對齊內政部實價登錄搜尋欄位</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="block text-[10px] text-text-muted">類型</span>
            <select
              value="sale"
              disabled
              className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary disabled:opacity-70"
            >
              <option value="sale">買賣案件</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] text-text-muted">搜尋模式</span>
            <select
              value={manualMode}
              onChange={(e) => setManualMode(e.target.value as 'nearby' | 'street_section')}
              disabled={isManualComparablePending}
              className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-60"
            >
              <option value="nearby">周邊距離</option>
              <option value="street_section">路段／地段</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] text-text-muted">區段位置或門牌</span>
            <input
              value={manualAddressKeyword}
              onChange={(e) => setManualAddressKeyword(e.target.value)}
              disabled={isManualComparablePending}
              placeholder="例：敦化南路、仁愛段、門牌關鍵字"
              className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent disabled:opacity-60"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] text-text-muted">距離</span>
            <select
              value={manualRadiusKm}
              onChange={(e) => setManualRadiusKm(e.target.value)}
              disabled={manualMode !== 'nearby' || isManualComparablePending}
              className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-60"
            >
              {MANUAL_RADIUS_OPTIONS.map((radius) => (
                <option key={radius} value={String(radius)}>
                  {radius} km
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] text-text-muted">街道</span>
            <input
              value={manualStreet}
              onChange={(e) => setManualStreet(e.target.value)}
              disabled={isManualComparablePending}
              placeholder="例：敦化南路四段"
              className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent disabled:opacity-60"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] text-text-muted">地段</span>
            <input
              value={manualLandSection}
              onChange={(e) => setManualLandSection(e.target.value)}
              disabled={isManualComparablePending}
              placeholder="例：仁愛段"
              className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent disabled:opacity-60"
            />
          </label>

          <div className="space-y-1.5 md:col-span-2">
            <span className="block text-[10px] text-text-muted">交易期間</span>
            <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-2">
              <select
                value={manualStartRocYear}
                onChange={(e) => setManualStartRocYear(e.target.value)}
                disabled={isManualComparablePending}
                className="rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-60"
              >
                {manualYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                ))}
              </select>
              <select
                value={manualStartMonth}
                onChange={(e) => setManualStartMonth(e.target.value)}
                disabled={isManualComparablePending}
                className="rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-60"
              >
                {MANUAL_MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {Number(month)} 月
                  </option>
                ))}
              </select>
              <span className="text-center text-[10px] text-text-muted">至</span>
              <select
                value={manualEndRocYear}
                onChange={(e) => setManualEndRocYear(e.target.value)}
                disabled={isManualComparablePending}
                className="rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-60"
              >
                {manualYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                ))}
              </select>
              <select
                value={manualEndMonth}
                onChange={(e) => setManualEndMonth(e.target.value)}
                disabled={isManualComparablePending}
                className="rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-60"
              >
                {MANUAL_MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {Number(month)} 月
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={resetManualComparableQuery}
            disabled={isManualComparablePending}
            className="inline-flex items-center rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-45"
          >
            全部清除
          </button>
          <button
            type="button"
            onClick={() => void handleManualComparableSearch()}
            disabled={isManualComparablePending}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25 transition-colors disabled:opacity-45"
          >
            {isManualComparablePending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileText size={12} />
            )}
            {isManualComparablePending ? `產出中 · 已 ${maxComparableElapsed} 秒` : '搜尋'}
          </button>
        </div>
        {pendingComparableKinds.length > 0 && (
          <div className="rounded-md border border-accent/20 bg-accent/8 px-3 py-2 text-[11px] text-text-secondary">
            成交行情表產出中，已花費 {maxComparableElapsed} 秒。完成後會自動儲存到資料庫，重新整理頁面後仍會保留。
          </div>
        )}
        <p className="text-[10px] text-text-muted leading-relaxed">
          * 欄位參照內政部實價登錄「類型、區段位置或門牌、街道、地段、交易期間」搜尋模式。產出後會寫入資料庫並顯示於上方預覽。
        </p>
      </div>
    ) : null;

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
      const latestUploadedDoc =
        [...updated]
          .reverse()
          .find((doc) => doc.documentType === docType) ?? null;
      setLatestUploadedDocId(latestUploadedDoc?.id ?? null);
    } else {
      showFeedback('error', result.message);
    }
  }

  async function refreshDocuments() {
    const updated = await getPropertyDocuments(propertyId);
    setDocuments(updated);
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

  const documentUploadPanel = docSectionMode !== 'transaction_comparables' ? (
    <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
      <p className="text-xs font-medium text-text-secondary">
        {visualUploadCopy ? (
          <>
            {visualUploadCopy.uploadLead}{' '}
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
          {visualUploadCopy ? visualUploadCopy.fileTypeLabel : '文件類型'}
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
      {visualUploadCopy && docFile && docPreviewUrl && (
        <div className="overflow-hidden rounded-lg border border-border-default bg-bg-tertiary">
          <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
            <div>
              <div className="text-xs font-medium text-text-primary">待上傳預覽</div>
              <div className="text-[11px] text-text-muted">{docFile.name}</div>
            </div>
          </div>

          <div className="aspect-[4/3] bg-bg-secondary">
            {docFile.type.startsWith('image/') || isImagePreviewable(docFile.name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={docPreviewUrl}
                alt={visualUploadCopy.pendingImageAlt}
                className="h-full w-full object-contain"
              />
            ) : docFile.type === 'application/pdf' || isPdfPreviewable(docFile.name) ? (
              <iframe
                src={docPreviewUrl}
                title={visualUploadCopy.pendingPdfTitle}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
                此檔案格式暫不支援 inline 預覽。
              </div>
            )}
          </div>
        </div>
      )}
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
        {isDocUploading ? '上傳中…' : visualUploadCopy ? visualUploadCopy.uploadBtn : '上傳文件'}
      </button>
    </div>
  ) : null;

  const floorPlanSourcePanel = (
    <section className="space-y-2 rounded-lg border border-border-default bg-bg-tertiary p-3">
      <div className="text-xs font-semibold text-text-primary">來源格局圖</div>
      {displayPreviewDocuments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default px-3 py-4 text-center text-xs text-text-muted">
          尚未上傳可供 AI 生成使用的格局圖。
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {displayPreviewDocuments.map((doc) => {
            const vc = visualPlanCopy('floor_plan');
            const isImage = isImagePreviewable(doc.filePath);
            const isPdf = isPdfPreviewable(doc.filePath);
            const isLatestUploaded = doc.id === latestUploadedDocId;

            return (
              <article
                key={doc.id}
                className={`overflow-hidden rounded-lg border bg-bg-primary transition-colors ${
                  isLatestUploaded
                    ? 'border-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.18)]'
                    : 'border-border-default'
                }`}
              >
                <div className="aspect-[4/3] bg-bg-secondary">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.url} alt={vc.docImageAlt(doc.documentName)} className="h-full w-full object-contain" />
                  ) : isPdf ? (
                    <iframe src={doc.url} title={vc.docPdfTitle(doc.documentName)} className="h-full w-full border-0" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
                      此檔案格式暫不支援 inline 預覽，請改用右下角開啟檢查。
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">Floor Plan</div>
                    {isLatestUploaded && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/25 bg-green-500/12 px-2 py-1 text-[11px] font-medium text-green-600">
                        <Star size={11} className="fill-current" />
                        上傳成功
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs font-medium text-text-primary">{doc.documentName}</div>
                  {isLatestUploaded && (
                    <div className="rounded-md bg-green-500/8 px-2 py-1.5 text-[11px] text-green-700">
                      {vc.latestNote}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:text-accent"
                      title="開啟文件"
                    >
                      <ExternalLink size={12} /> 開啟
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDocDelete(doc)}
                      className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:text-red-500"
                      title="刪除文件"
                    >
                      <Trash2 size={12} /> 刪除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const floorPlanAiHistoryPanel = displayAiGeneratedDocuments.length > 0 ? (
    <section className="overflow-hidden rounded-lg border border-border-default bg-bg-tertiary">
      <div className="border-b border-border-default px-3 py-2 text-xs font-semibold text-text-primary">
        已儲存 AI 參考圖
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-xs">
          <thead className="bg-bg-secondary text-[11px] text-text-muted">
            <tr>
              <th className="w-20 px-2 py-2 font-medium">縮圖</th>
              <th className="px-2 py-2 font-medium">名稱</th>
              <th className="w-44 px-2 py-2 font-medium">生成模型</th>
              <th className="w-36 px-2 py-2 font-medium">產生時間</th>
              <th className="w-24 px-2 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {displayAiGeneratedDocuments.map((doc) => {
              const generatedModelLabel = aiGeneratedModelLabel(doc);
              return (
                <tr key={doc.id} className="align-middle">
                  <td className="px-2 py-2">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-16 items-center justify-center rounded border border-border-default bg-bg-secondary"
                      aria-label={`開啟完整 AI 參考圖：${doc.documentName}`}
                    >
                      {isImagePreviewable(doc.filePath) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.url} alt={`AI 參考圖縮圖：${doc.documentName}`} className="h-full w-full object-contain" />
                      ) : (
                        <FileText size={16} className="text-text-muted" />
                      )}
                    </a>
                  </td>
                  <td className="max-w-[260px] px-2 py-2 font-medium text-text-primary">
                    <span className="block truncate" title={doc.documentName}>{doc.documentName}</span>
                  </td>
                  <td className="max-w-[180px] px-2 py-2 text-text-secondary">
                    <span className="block truncate" title={generatedModelLabel ?? undefined}>{generatedModelLabel ?? '—'}</span>
                  </td>
                  <td className="px-2 py-2 text-text-muted">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('zh-TW') : '—'}</td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-accent"
                        title="開啟文件"
                      >
                        <ExternalLink size={11} /> 開啟
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDocDelete(doc)}
                        className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-red-500"
                        title="刪除文件"
                      >
                        <Trash2 size={11} /> 刪除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  ) : null;

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
          className={`p-2.5 rounded-md text-xs relative group ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          <div className="pr-6">{feedback.message}</div>
          <button
            type="button"
            onClick={clearFeedback}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
            title="關閉提示"
          >
            <X size={14} />
          </button>
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
        /* ── Documents (謄本／權狀／合約／部落格／格局圖／建物測量成果圖) ── */
        <div className="space-y-4">
          {docSectionMode === 'floor_plan' ? (
            <>
              <section className="space-y-2 rounded-lg border border-border-default bg-bg-tertiary p-3">
                <div className="text-xs font-semibold text-text-primary">上傳來源格局圖</div>
                {documentUploadPanel}
              </section>
              {floorPlanSourcePanel}
              <FloorPlanAIStudio
                propertyId={propertyId}
                propertyType={propertyType}
                ownerId={ownerId}
                documents={displayDocuments}
                onDocumentsChanged={refreshDocuments}
              />
              {floorPlanAiHistoryPanel}
            </>
          ) : (
            <>
          {displayDocuments.length === 0 ? (
            <p className="text-text-muted text-xs">
              {docSectionMode && isVisualPlanSection(docSectionMode as unknown as DocumentSectionMode)
                ? visualPlanCopy(docSectionMode as unknown as VisualPlanSectionMode).empty
                : '尚無文件'}
            </p>
          ) : docSectionMode && isVisualPlanSection(docSectionMode as unknown as DocumentSectionMode) ? (
            <div className="space-y-3">
              {displayPreviewDocuments.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {displayPreviewDocuments.map((doc) => {
                const vc = visualPlanCopy(docSectionMode as unknown as VisualPlanSectionMode);
                const isImage = isImagePreviewable(doc.filePath);
                const isPdf = isPdfPreviewable(doc.filePath);
                const isLatestUploaded = doc.id === latestUploadedDocId;

                return (
                  <article
                    key={doc.id}
                    className={`overflow-hidden rounded-lg border bg-bg-tertiary transition-colors ${
                      isLatestUploaded
                        ? 'border-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.18)]'
                        : 'border-border-default'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-bg-secondary">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.url}
                          alt={vc.docImageAlt(doc.documentName)}
                          className="h-full w-full object-contain"
                        />
                      ) : isPdf ? (
                        <iframe
                          src={doc.url}
                          title={vc.docPdfTitle(doc.documentName)}
                          className="h-full w-full border-0"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
                          此檔案格式暫不支援 inline 預覽，請改用右下角開啟檢查。
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                          {vc.badgeEn}
                        </div>
                        {isLatestUploaded && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-500/25 bg-green-500/12 px-2 py-1 text-[11px] font-medium text-green-600">
                            <Star size={11} className="fill-current" />
                            上傳成功
                          </span>
                        )}
                      </div>

                      <div className="mt-1 truncate text-xs font-medium text-text-primary">
                        {doc.documentName}
                      </div>

                      {isLatestUploaded && (
                        <div className="rounded-md bg-green-500/8 px-2 py-1.5 text-[11px] text-green-700">
                          {vc.latestNote}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:text-accent"
                          title="開啟文件"
                        >
                          <ExternalLink size={12} /> 開啟
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDocDelete(doc)}
                          className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:text-red-500"
                          title="刪除文件"
                        >
                          <Trash2 size={12} /> 刪除
                        </button>
                      </div>
                    </div>
                  </article>
                );
                  })}
                </div>
              )}

              {displayAiGeneratedDocuments.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border-default bg-bg-tertiary">
                  <div className="border-b border-border-default px-3 py-2 text-xs font-semibold text-text-primary">
                    AI 參考圖
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-left text-xs">
                      <thead className="bg-bg-secondary text-[11px] text-text-muted">
                        <tr>
                          <th className="w-20 px-2 py-2 font-medium">縮圖</th>
                          <th className="px-2 py-2 font-medium">名稱</th>
                          <th className="w-44 px-2 py-2 font-medium">生成模型</th>
                          <th className="w-36 px-2 py-2 font-medium">產生時間</th>
                          <th className="w-24 px-2 py-2 text-right font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {displayAiGeneratedDocuments.map((doc) => {
                          const generatedModelLabel = aiGeneratedModelLabel(doc);
                          return (
                            <tr key={doc.id} className="align-middle">
                              <td className="px-2 py-2">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex h-12 w-16 items-center justify-center rounded border border-border-default bg-bg-secondary"
                                  aria-label={`開啟完整 AI 參考圖：${doc.documentName}`}
                                >
                                  {isImagePreviewable(doc.filePath) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={doc.url} alt={`AI 參考圖縮圖：${doc.documentName}`} className="h-full w-full object-contain" />
                                  ) : (
                                    <FileText size={16} className="text-text-muted" />
                                  )}
                                </a>
                              </td>
                              <td className="max-w-[260px] px-2 py-2 font-medium text-text-primary">
                                <span className="block truncate" title={doc.documentName}>{doc.documentName}</span>
                              </td>
                              <td className="max-w-[180px] px-2 py-2 text-text-secondary">
                                <span className="block truncate" title={generatedModelLabel ?? undefined}>{generatedModelLabel ?? '—'}</span>
                              </td>
                              <td className="px-2 py-2 text-text-muted">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('zh-TW') : '—'}</td>
                              <td className="px-2 py-2">
                                <div className="flex justify-end gap-1">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-accent"
                                    title="開啟文件"
                                  >
                                    <ExternalLink size={11} /> 開啟
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDocDelete(doc)}
                                    className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-red-500"
                                    title="刪除文件"
                                  >
                                    <Trash2 size={11} /> 刪除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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

          {transactionComparableManualQueryPanel}

          {/* Upload new document */}
          {docSectionMode !== 'transaction_comparables' && (
          <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
            <p className="text-xs font-medium text-text-secondary">
              {visualUploadCopy ? (
                <>
                  {visualUploadCopy.uploadLead}{' '}
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
                {visualUploadCopy ? visualUploadCopy.fileTypeLabel : '文件類型'}
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
            {visualUploadCopy && docFile && docPreviewUrl && (
              <div className="overflow-hidden rounded-lg border border-border-default bg-bg-tertiary">
                <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
                  <div>
                    <div className="text-xs font-medium text-text-primary">待上傳預覽</div>
                    <div className="text-[11px] text-text-muted">{docFile.name}</div>
                  </div>
                </div>

                <div className="aspect-[4/3] bg-bg-secondary">
                  {docFile.type.startsWith('image/') || isImagePreviewable(docFile.name) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={docPreviewUrl}
                      alt={visualUploadCopy.pendingImageAlt}
                      className="h-full w-full object-contain"
                    />
                  ) : docFile.type === 'application/pdf' || isPdfPreviewable(docFile.name) ? (
                    <iframe
                      src={docPreviewUrl}
                      title={visualUploadCopy.pendingPdfTitle}
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
                      此檔案格式暫不支援 inline 預覽。
                    </div>
                  )}
                </div>
              </div>
            )}
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
              {isDocUploading ? '上傳中…' : visualUploadCopy ? visualUploadCopy.uploadBtn : '上傳文件'}
            </button>
          </div>
          )}

          {/* AI 解析謄本（目前僅土地謄本） — extracted to TranscriptParseSection */}
          {transcriptDocs.length > 0 && (
            <TranscriptParseSection transcriptDocs={transcriptDocs} kind="land" />
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
