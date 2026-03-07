// filepath: apps/superadmin/components/admin/properties/TranscriptTabContent.tsx
// 謄本單頁：左欄建物全部（上傳＋雲端解析＋表單）、右欄土地全部（上傳＋雲端解析＋表單）
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, ExternalLink, Trash2, Loader2, Upload } from 'lucide-react';
import {
  getPropertyDocuments,
  uploadPropertyDocument,
  deletePropertyDocument,
} from '@/lib/actions/properties';
import type { PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';
import type { LandRegistryParsedResult } from '@/lib/types/transcript';
import { TranscriptParseSection } from './TranscriptParseSection';
import { BuildingTranscriptForm } from './BuildingTranscriptForm';
import { LandTranscriptForm } from './LandTranscriptForm';

type TranscriptKind = 'building' | 'land';

const DOC_TYPE_BY_KIND: Record<TranscriptKind, 'building_registry_transcript' | 'land_registry_transcript'> = {
  building: 'building_registry_transcript',
  land: 'land_registry_transcript',
};

interface TranscriptColumnProps {
  kind: TranscriptKind;
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  documents: PropertyDocumentItem[];
  onRefresh: () => Promise<void>;
  initialBuildingData?: PropertyItem['buildingTranscript'];
  initialLandData?: PropertyItem['landTranscript'];
}

function TranscriptColumn({
  kind,
  propertyId,
  propertyType,
  ownerId,
  documents,
  onRefresh,
  initialBuildingData,
  initialLandData,
}: TranscriptColumnProps) {
  const docType = DOC_TYPE_BY_KIND[kind];
  const title = kind === 'building' ? '建物全部' : '土地全部';
  const uploadLabel = kind === 'building' ? '上傳建物謄本' : '上傳土地謄本';
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fillFromParse, setFillFromParse] = useState<LandRegistryParsedResult | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const onTranscribeApplied = useCallback(() => setFillFromParse(null), []);

  async function handleDocUpload() {
    if (!docFile) return;
    setIsDocUploading(true);
    setFeedback(null);
    const fd = new FormData();
    fd.append('file', docFile);
    const result = await uploadPropertyDocument(propertyId, propertyType, ownerId, docType, fd);
    setIsDocUploading(false);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = '';
      await onRefresh();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  }

  async function handleDocDelete(doc: PropertyDocumentItem) {
    const result = await deletePropertyDocument(doc.id, doc.filePath);
    if (result.success) {
      setFeedback({ type: 'success', message: '文件已刪除' });
      await onRefresh();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  }

  return (
    <div className="flex flex-col min-h-0 rounded-lg border border-border-default bg-bg-primary overflow-hidden h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-scroll p-4 space-y-4">
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

        {/* 上傳謄本（依 kind 顯示建物/土地） */}
        <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
          <p className="text-xs font-medium text-text-secondary">
            {uploadLabel} <span className="text-text-muted font-normal">(PDF / JPG / PNG / WebP，最大 20 MB)</span>
          </p>
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
            {isDocUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {isDocUploading ? '上傳中…' : uploadLabel}
          </button>
        </div>

        {/* 已上傳文件列表 */}
        {documents.length > 0 ? (
          <ul className="space-y-1.5">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-bg-tertiary border border-border-default"
              >
                <FileText size={14} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-primary truncate block">{doc.documentName}</span>
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
        ) : (
          <p className="text-text-muted text-xs">尚無{title}謄本文件</p>
        )}

        {/* 雲端解析謄本 */}
        {documents.length > 0 && (
          <TranscriptParseSection
            transcriptDocs={documents}
            onTranscribe={kind === 'building' ? (result) => setFillFromParse(result) : undefined}
          />
        )}

        {/* 建物／土地結構化表單 */}
        {kind === 'building' && (
          <BuildingTranscriptForm
            propertyId={propertyId}
            propertyType={propertyType}
            initialData={initialBuildingData}
            fillFromParsedResult={fillFromParse}
            onTranscribeApplied={onTranscribeApplied}
          />
        )}
        {kind === 'land' && (
          <LandTranscriptForm
            propertyId={propertyId}
            propertyType={propertyType}
            initialData={initialLandData}
          />
        )}
      </div>
    </div>
  );
}

interface TranscriptTabContentProps {
  property: PropertyItem;
}

export function TranscriptTabContent({ property }: TranscriptTabContentProps) {
  const [documents, setDocuments] = useState<PropertyDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const list = await getPropertyDocuments(property.id);
    setDocuments(list);
  };

  useEffect(() => {
    let cancelled = false;
    getPropertyDocuments(property.id).then((list) => {
      if (!cancelled) setDocuments(list);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [property.id]);

  const buildingDocs = documents.filter((d) => d.documentType === 'building_registry_transcript');
  const landDocs = documents.filter((d) => d.documentType === 'land_registry_transcript');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        <Loader2 size={18} className="animate-spin mr-2" />
        載入中…
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TranscriptColumn
        kind="building"
        propertyId={property.id}
        propertyType={property.type}
        ownerId={property.ownerId}
        documents={buildingDocs}
        onRefresh={refresh}
        initialBuildingData={property.buildingTranscript}
      />
      <TranscriptColumn
        kind="land"
        propertyId={property.id}
        propertyType={property.type}
        ownerId={property.ownerId}
        documents={landDocs}
        onRefresh={refresh}
        initialLandData={property.landTranscript}
      />
    </div>
  );
}
