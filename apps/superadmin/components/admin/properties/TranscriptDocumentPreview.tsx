'use client';

import { FileText } from 'lucide-react';

import type { TranscriptIntakeAreaDetailRow } from '@/lib/transcript-parse/intake-types';
import type { PropertyDocumentItem } from '@/lib/types/properties';

interface TranscriptDocumentPreviewProps {
  documents: PropertyDocumentItem[];
  selectedDocumentId: string | null;
  selectedRow: TranscriptIntakeAreaDetailRow | null;
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|tiff?)($|\?)/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.includes('/view');
}

export function TranscriptDocumentPreview({
  documents,
  selectedDocumentId,
  selectedRow,
}: TranscriptDocumentPreviewProps) {
  const selectedDocument = selectedRow?.sourceDocumentId
    ? documents.find((doc) => doc.id === selectedRow.sourceDocumentId) ?? documents[0] ?? null
    : selectedDocumentId
      ? documents.find((doc) => doc.id === selectedDocumentId) ?? documents[0] ?? null
      : documents[0] ?? null;
  const isMultiPreview = documents.length > 1;
  const previewHeightClass = isMultiPreview ? 'h-[360px]' : 'h-[640px]';
  const previewMinHeightClass = isMultiPreview ? 'min-h-[320px]' : 'min-h-[520px]';

  return (
    <aside className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
      <div className="border-b border-border-default px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">文件預覽與來源</h3>
          </div>
        </div>
      </div>

      <div className="p-4">
        {selectedRow ? (
          <div className="mb-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2">
            <p className="text-xs font-medium text-text-primary">{selectedRow.identifier || selectedRow.label || '來源欄位'}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              {selectedRow.evidenceText || '目前尚未有座標 evidence；下一階段會接 VLM bbox 以紅框標示。'}
            </p>
          </div>
        ) : null}

        {documents.length ? (
          <div className="space-y-4">
            {documents.map((doc, index) => {
              const isFocused = selectedDocument?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`overflow-hidden rounded-md border ${
                    isFocused ? 'border-accent/50 bg-accent/5' : 'border-border-default bg-bg-secondary'
                  }`}
                >
                  <div className="border-b border-border-default px-3 py-2">
                    <p className="truncate text-xs font-medium text-text-primary">
                      第 {index + 1}/{documents.length} 份：{doc.documentName}
                    </p>
                  </div>
                  <div className={`relative ${previewMinHeightClass} bg-bg-secondary`}>
                    {isImageUrl(doc.url) ? (
                      <img
                        src={doc.url}
                        alt={doc.documentName}
                        className={`${previewHeightClass} w-full object-contain`}
                      />
                    ) : isPdfUrl(doc.url) ? (
                      <iframe src={doc.url} title={`謄本預覽：${doc.documentName}`} className={`${previewHeightClass} w-full bg-white`} />
                    ) : (
                      <div className={`flex ${previewMinHeightClass} items-center justify-center px-6 text-center text-xs text-text-muted`}>
                        此格式無法內嵌預覽，請使用左側開啟文件查看原始文件。
                      </div>
                    )}
                    {selectedRow?.evidenceText && isFocused ? (
                      <div className="pointer-events-none absolute left-4 top-4 rounded border-2 border-red-500 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-600">
                        來源參考
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[520px] items-center justify-center rounded-md border border-dashed border-border-default bg-bg-secondary px-6 text-center text-xs text-text-muted">
            勾選謄本後，這裡會同步顯示文件與欄位來源。
          </div>
        )}
      </div>
    </aside>
  );
}
