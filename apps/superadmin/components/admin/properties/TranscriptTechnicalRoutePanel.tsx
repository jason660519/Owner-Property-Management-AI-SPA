'use client';

import { FileText, Route } from 'lucide-react';

import type { PropertyDocumentItem } from '@/lib/types/properties';

interface TranscriptTechnicalRoutePanelProps {
  documents: PropertyDocumentItem[];
  run: { routeDecision: Record<string, unknown> } | null;
}

interface RouteDocument {
  documentId: string;
  documentName: string;
  route: string;
  reasons: string[];
  metrics: Record<string, unknown>;
  pdfTextProbe: Record<string, unknown>;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function routeLabel(route: string): string {
  switch (route) {
    case 'local_python_text':
      return '本地文字層（Python / pdftotext）';
    case 'vlm_visual':
      return 'VLM 視覺解析';
    case 'structured_json':
      return 'JSON 結構化正規化';
    case 'unsupported':
      return '不支援';
    default:
      return asString(route, '尚未判斷');
  }
}

function routeTone(route: string): string {
  switch (route) {
    case 'local_python_text':
      return 'border-green-500/30 bg-green-500/10 text-green-700';
    case 'vlm_visual':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700';
    case 'structured_json':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-700';
    case 'unsupported':
      return 'border-red-500/30 bg-red-500/10 text-red-600';
    default:
      return 'border-border-default bg-bg-tertiary text-text-secondary';
  }
}

function getRouteDocuments(run: TranscriptTechnicalRoutePanelProps['run']): RouteDocument[] {
  const routeDecision = asObject(run?.routeDecision);
  const rawDocuments = Array.isArray(routeDecision.documents) ? routeDecision.documents : [];
  return rawDocuments.map((raw) => {
    const item = asObject(raw);
    return {
      documentId: asString(item.documentId, ''),
      documentName: asString(item.documentName),
      route: asString(item.route, ''),
      reasons: asStringList(item.reasons),
      metrics: asObject(item.metrics),
      pdfTextProbe: asObject(item.pdfTextProbe),
    };
  });
}

function metricParts(doc: RouteDocument): string[] {
  const textLength = asNumber(doc.metrics.extractedTextLength);
  const cjkCount = asNumber(doc.metrics.cjkCharacterCount);
  const markerCount = asNumber(doc.metrics.registryMarkerCount);
  const pageCount = asNumber(doc.pdfTextProbe.pageCount);
  const likelyScanned = doc.pdfTextProbe.likelyScanned === true;
  return [
    pageCount === null ? null : `${pageCount} 頁`,
    textLength === null ? null : `文字 ${textLength}`,
    cjkCount === null ? null : `繁中 ${cjkCount}`,
    markerCount === null ? null : `謄本標記 ${markerCount}`,
    likelyScanned ? '疑似掃描件' : null,
  ].filter((part): part is string => Boolean(part));
}

export function TranscriptTechnicalRoutePanel({
  documents,
  run,
}: TranscriptTechnicalRoutePanelProps) {
  const routeDocuments = getRouteDocuments(run);

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3">
      <div className="flex items-center gap-2">
        <Route size={15} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">技術選擇</h3>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        PDF 會先做文字層 probe，可解析繁中時走 Python；抽不到文字或疑似掃描件時改走 VLM。
      </p>

      {routeDocuments.length ? (
        <div className="mt-3 grid gap-2">
          {routeDocuments.map((doc, index) => {
            const parts = metricParts(doc);
            return (
              <div
                key={doc.documentId || `${doc.documentName}-${index}`}
                className="rounded-md border border-border-default bg-bg-primary px-3 py-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-text-primary">{doc.documentName}</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {parts.length ? parts.join(' / ') : '尚無 probe 指標'}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${routeTone(doc.route)}`}>
                    {routeLabel(doc.route)}
                  </span>
                </div>
                {doc.reasons[0] ? (
                  <p className="mt-2 text-[11px] text-text-muted">{doc.reasons[0]}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : documents.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 rounded border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-secondary hover:border-accent/50"
            >
              <FileText size={13} className="shrink-0 text-text-muted" />
              <span className="truncate">{doc.documentName}</span>
            </a>
          ))}
          <p className="md:col-span-2 text-xs text-text-muted">
            建立並判讀後，這裡會顯示每份檔案實際採用 Python、VLM 或 JSON。
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-muted">先上傳謄本文件後，即可建立工作台任務。</p>
      )}
    </div>
  );
}
