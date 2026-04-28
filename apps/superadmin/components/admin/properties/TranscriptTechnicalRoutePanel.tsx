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
  pages: RoutePage[];
}

interface RoutePage {
  pageNumber: number | null;
  pageRole: string;
  sourceTrust: string;
  orientation: string;
  confidence: number | null;
  evidenceText: string;
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

function getRoutePages(value: unknown): RoutePage[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = asObject(raw);
    return {
      pageNumber: asNumber(item.pageNumber),
      pageRole: asString(item.pageRole, 'unknown'),
      sourceTrust: asString(item.sourceTrust, 'unknown'),
      orientation: asString(item.orientation, 'unknown'),
      confidence: asNumber(item.confidence),
      evidenceText: asString(item.evidenceText, ''),
    };
  });
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

function pageRoleLabel(role: string): string {
  switch (role) {
    case 'building_transcript':
      return '建物謄本';
    case 'land_transcript':
      return '土地謄本';
    case 'building_title':
      return '建物權狀';
    case 'land_title':
      return '土地權狀';
    case 'parking_building_transcript':
      return '車位建物謄本';
    case 'parking_land_transcript':
      return '車位土地謄本';
    case 'mixed_transcript':
      return '混合謄本';
    case 'property_description':
      return '不動產說明書';
    case 'investigation_report':
      return '物件調查報告';
    case 'map_or_photo':
      return '圖資/照片';
    default:
      return '待判讀';
  }
}

function sourceTrustLabel(sourceTrust: string): string {
  switch (sourceTrust) {
    case 'authoritative':
      return '正式來源';
    case 'reference_only':
      return '參考來源';
    case 'ignore':
      return '略過';
    default:
      return '待確認';
  }
}

function sourceTrustTone(sourceTrust: string): string {
  switch (sourceTrust) {
    case 'authoritative':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
    case 'reference_only':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
    case 'ignore':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-600';
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
      pages: getRoutePages(item.pages),
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

function pageSummaryParts(pages: RoutePage[]): string[] {
  const official = pages.filter((page) => page.sourceTrust === 'authoritative').length;
  const reference = pages.filter((page) => page.sourceTrust === 'reference_only').length;
  const ignored = pages.filter((page) => page.sourceTrust === 'ignore').length;
  const unknown = pages.filter((page) => page.sourceTrust === 'unknown').length;
  return [
    official ? `正式 ${official}` : null,
    reference ? `參考 ${reference}` : null,
    ignored ? `略過 ${ignored}` : null,
    unknown ? `待確認 ${unknown}` : null,
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
                {doc.pages.length ? (
                  <div className="mt-3 rounded border border-border-default bg-bg-secondary/60 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-medium text-text-secondary">頁面分類</p>
                      {pageSummaryParts(doc.pages).map((part) => (
                        <span key={part} className="rounded bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-muted">
                          {part}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {doc.pages.slice(0, 5).map((page, pageIndex) => (
                        <div
                          key={`${doc.documentId}-${page.pageNumber ?? pageIndex}`}
                          className="grid gap-1 rounded bg-bg-primary px-2 py-1.5 text-[11px] sm:grid-cols-[auto_auto_1fr]"
                        >
                          <span className="font-medium text-text-secondary">
                            P{page.pageNumber ?? pageIndex + 1}
                          </span>
                          <span className={`w-fit rounded border px-1.5 py-0.5 ${sourceTrustTone(page.sourceTrust)}`}>
                            {sourceTrustLabel(page.sourceTrust)}
                          </span>
                          <span className="min-w-0 truncate text-text-muted">
                            {pageRoleLabel(page.pageRole)}
                            {page.orientation !== 'unknown' ? ` / ${page.orientation}` : ''}
                            {page.confidence === null ? '' : ` / ${Math.round(page.confidence * 100)}%`}
                            {page.evidenceText ? ` / ${page.evidenceText}` : ''}
                          </span>
                        </div>
                      ))}
                      {doc.pages.length > 5 ? (
                        <p className="text-[10px] text-text-muted">另有 {doc.pages.length - 5} 頁待展開檢視</p>
                      ) : null}
                    </div>
                  </div>
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
