'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ExternalLink, FileText, Loader2, Trash2, Upload, Eye, X } from 'lucide-react';
import type { PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';
import {
  deletePropertyDocument,
  getPropertyDocuments,
  getDocumentParseResult,
  uploadPropertyDocument,
} from '@/lib/actions/properties';
import {
  collectZoningLandParcels,
  type ZoningLandParcelOption,
} from '@/lib/utils/zoning-land-parcels';
import { parseLandNumber } from '@/lib/utils/taipei-land-number-parser';
import { TaipeiZoningAutoQuery } from './TaipeiZoningAutoQuery';

// ── Main component ───────────────────────────────────────────────────────

const ZONING_DOCUMENT_TYPE = 'zoning_usage_certificate';

interface ZoningUsageTabProps {
  property: PropertyItem;
}

export function ZoningUsageTab({ property }: ZoningUsageTabProps) {
  const districtHint = property.addressDistrict ?? '';

  const confirmedLandParcels = useMemo(() => collectZoningLandParcels(property), [property]);

  const [documentLandParcels, setDocumentLandParcels] = useState<ZoningLandParcelOption[]>([]);
  const [zoningDocuments, setZoningDocuments] = useState<PropertyDocumentItem[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<PropertyDocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const landParcels = useMemo(() => {
    const seen = new Set<string>();
    return [...confirmedLandParcels, ...documentLandParcels].filter((parcel) => {
      const key = parcel.value.replace(/\s+/g, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [confirmedLandParcels, documentLandParcels]);

  const loadDocuments = useCallback(async (cancelled?: () => boolean) => {
    const docs = await getPropertyDocuments(property.id);
    if (cancelled?.()) return;

    setZoningDocuments(docs.filter((doc) => doc.documentType === ZONING_DOCUMENT_TYPE));

    const landDocs = docs.filter(d =>
      d.documentType === 'land_registry_transcript' ||
      d.documentType === 'parking_land_registry_transcript'
    );

    const parcels: ZoningLandParcelOption[] = [];

    for (const doc of landDocs) {
      const res = await getDocumentParseResult(doc.id);
      if (cancelled?.()) return;
      if (res?.parsedResult?.landTranscript) {
        const lt = res.parsedResult.landTranscript;
        const title = lt.header?.documentTitle;
        const num = lt.description?.landNumber;
        if (num && parseLandNumber(num)) {
          parcels.push({ label: `${doc.documentName}: ${num}`, value: num });
        } else if (title && parseLandNumber(title)) {
          parcels.push({ label: title, value: title });
        }
      }
    }

    if (cancelled?.()) return;
    const uniqueParcels = parcels.filter((p, index, self) =>
      index === self.findIndex((t) => t.value === p.value)
    );
    setDocumentLandParcels(uniqueParcels);
  }, [property.id]);

  useEffect(() => {
    let cancelled = false;
    void loadDocuments(() => cancelled);

    return () => { cancelled = true; };
  }, [loadDocuments]);

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    const result = await uploadPropertyDocument(
      property.id,
      property.type,
      property.ownerId,
      ZONING_DOCUMENT_TYPE,
      formData,
    );

    setUploading(false);
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) {
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
    }
  }, [loadDocuments, property.id, property.ownerId, property.type, uploadFile]);

  const handleDelete = useCallback(async (doc: PropertyDocumentItem) => {
    setFeedback(null);
    const result = await deletePropertyDocument(doc.id, doc.filePath);
    setFeedback({ type: result.success ? 'success' : 'error', message: result.success ? '文件已刪除' : result.message });
    if (result.success) {
      setPreviewDocument((prev) => (prev?.id === doc.id ? null : prev));
      await loadDocuments();
    }
  }, [loadDocuments]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">使用分區與土地資訊</h3>
      </div>

      {landParcels.length > 0 ? (
        <TaipeiZoningAutoQuery
          landParcels={landParcels}
          districtHint={districtHint}
          propertyId={property.id}
          propertyType={property.type}
          ownerId={property.ownerId}
          onSavedDocument={() => loadDocuments()}
        />
      ) : (
        <div className="rounded-lg border border-border-default bg-bg-primary px-4 py-6 text-sm text-text-muted">
          尚未取得可查詢的土地地號。
        </div>
      )}

      <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3 space-y-3 text-xs">
        <div className="space-y-1">
          <p className="font-medium text-text-secondary">手動查詢並上傳使用分區檔案</p>
          <p className="text-text-muted">
            若需官方最新的使用分區與相關規定，請使用各縣市地政局「使用分區查詢」系統查詢，並將查詢結果或證明檔案上傳留存。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://zone.udd.gov.taipei/ZoneSearch.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            臺北市使用分區查詢
            <ExternalLink size={12} />
          </a>
          <a
            href="https://landmap.tainan.gov.tw/gis/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-primary text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            臺南市
            <ExternalLink size={12} />
          </a>
          <a
            href="https://urban.planning.ntpc.gov.tw/NtpcURInfo/Map.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-primary text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            新北市
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="rounded-md border border-border-default bg-bg-primary px-3 py-3 space-y-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 font-medium text-text-secondary">
              <Upload size={14} className="text-accent" />
              上傳使用分區證明／查詢結果
            </p>
            <p className="text-text-muted">支援 PDF、圖片、TXT、CSV、JSON，單檔 20MB 以內。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              aria-label="上傳使用分區證明檔案"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,.bmp,.txt,.csv,.json,application/pdf,image/*,text/plain,text/csv,application/json"
              className="block w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              onChange={(event) => {
                setUploadFile(event.target.files?.[0] ?? null);
                setFeedback(null);
              }}
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? '上傳中…' : '上傳'}
            </button>
          </div>

          {feedback && (
            <p className={feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}>
              {feedback.message}
            </p>
          )}

          {zoningDocuments.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-text-secondary">已上傳文件</p>
              <div className="space-y-1.5">
                {zoningDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-md border border-border-default bg-bg-secondary px-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 items-center gap-1.5 text-text-primary hover:text-accent"
                    >
                      <FileText size={14} className="shrink-0 text-accent" />
                      <span className="truncate">{doc.documentName}</span>
                    </a>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDocument(doc)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-accent hover:bg-accent/10"
                      >
                        <Eye size={13} />
                        預覽
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(doc)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewDocument && (
            <div className="overflow-hidden rounded-md border border-border-default bg-bg-primary">
              <div className="flex items-center justify-between gap-2 border-b border-border-default px-3 py-2">
                <p className="min-w-0 truncate text-xs font-medium text-text-primary">
                  {previewDocument.documentName}
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  title="關閉預覽"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              </div>
              <iframe
                title="使用分區上傳檔案預覽"
                src={previewDocument.url}
                className="h-[420px] w-full bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
