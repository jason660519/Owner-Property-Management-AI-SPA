'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, Edit3, Eye, Printer, RotateCcw } from 'lucide-react';
import type { ContractDraft } from '@/lib/types/contracts';
import {
  buildContractDocumentFileName,
  getContractOfficialDocxTemplatePath,
  renderContractDocumentDocx,
  renderContractDocumentDocxFromHtml,
  renderContractDocumentHtml,
  renderHtmlDocument,
} from '@/lib/utils/contract-document-renderer';

const ContractRichTextEditor = dynamic(
  () => import('./ContractRichTextEditor').then((m) => ({ default: m.ContractRichTextEditor })),
  { ssr: false, loading: () => <div className="flex h-[600px] items-center justify-center text-text-muted">載入編輯器…</div> },
);

interface ContractPreviewToggleProps {
  draft: ContractDraft;
  previewHtml: string;
  editedHtml: string | null;
  onEditedHtmlChange: (html: string | null) => void;
  onError: (message: string) => void;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ContractPreviewToggle({
  draft,
  previewHtml,
  editedHtml,
  onEditedHtmlChange,
  onError,
}: ContractPreviewToggleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const hasEdits = editedHtml !== null;
  // Ref to hold the latest edited body HTML for re-mounting the editor after toggle
  const editedBodyRef = useRef<string | null>(editedHtml);
  // Snapshot of the HTML to mount the editor with — set once when entering edit mode
  const editorMountHtmlRef = useRef<string>(previewHtml);
  // Debounce timer ref to avoid flooding parent state on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorChange = useCallback((html: string) => {
    editedBodyRef.current = html;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onEditedHtmlChange(html), 300);
  }, [onEditedHtmlChange]);

  function handleEnterEdit() {
    // Snapshot: if user had previous edits, wrap body in full doc; otherwise use original preview
    const title = draft.contractType === 'lease' ? '租賃契約草稿' : '買賣契約草稿';
    editorMountHtmlRef.current = editedBodyRef.current
      ? renderHtmlDocument(title, editedBodyRef.current)
      : previewHtml;
    setIsEditing(true);
  }

  // Build the final HTML for export: use edited body wrapped in full document, or original preview
  function getFinalHtml(): string {
    if (!hasEdits) return previewHtml;
    const title = draft.contractType === 'lease' ? '租賃契約草稿' : '買賣契約草稿';
    return renderHtmlDocument(title, editedHtml);
  }

  function handleDownloadHtml() {
    downloadBlob(
      new Blob([getFinalHtml()], { type: 'text/html;charset=utf-8' }),
      buildContractDocumentFileName(draft),
    );
  }

  async function handleDownloadDocx() {
    try {
      if (hasEdits) {
        const bytes = await renderContractDocumentDocxFromHtml(
          getFinalHtml(),
          buildContractDocumentFileName(draft, 'docx'),
        );
        downloadBlob(
          new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
          buildContractDocumentFileName(draft, 'docx'),
        );
      } else {
        const res = await fetch(getContractOfficialDocxTemplatePath(draft.contractType), { cache: 'no-store' });
        const templateBytes = res.ok ? new Uint8Array(await res.arrayBuffer()) : undefined;
        const bytes = await renderContractDocumentDocx(draft, { templateDocxBytes: templateBytes });
        downloadBlob(
          new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
          buildContractDocumentFileName(draft, 'docx'),
        );
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : '下載 DOCX 失敗');
    }
  }

  function handlePrint() {
    const url = URL.createObjectURL(new Blob([getFinalHtml()], { type: 'text/html;charset=utf-8' }));
    const win = window.open(url, '_blank');
    if (!win) {
      onError('無法開啟列印視窗，請確認瀏覽器未封鎖彈出視窗。');
      URL.revokeObjectURL(url);
      return;
    }
    win.onload = () => {
      win.print();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }

  function handleResetEdits() {
    editedBodyRef.current = null;
    onEditedHtmlChange(null);
    setIsEditing(false);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-default bg-bg-secondary/30 p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-semibold text-text-primary">契約草稿預覽</h5>
            {hasEdits && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">已編輯</span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {isEditing
              ? '編輯模式：可直接修改合約條文內容，修改後可匯出。'
              : '依官方範本填入資料後之草稿，供律師或代書參考，不具法律效力。'}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {draft.contractType === 'lease' ? '房屋租賃契約書' : '成屋買賣契約書'} · {draft.propertyAddress}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit / Preview toggle */}
          <button
            type="button"
            onClick={() => isEditing ? setIsEditing(false) : handleEnterEdit()}
            className={[
              'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isEditing
                ? 'bg-accent text-white'
                : 'border border-border-default bg-bg-primary text-text-primary hover:bg-bg-hover',
            ].join(' ')}
          >
            {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {isEditing ? '預覽模式' : '編輯模式'}
          </button>

          {/* Reset edits */}
          {hasEdits && (
            <button
              type="button"
              onClick={handleResetEdits}
              className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover"
            >
              <RotateCcw className="h-4 w-4" />
              還原原始內容
            </button>
          )}

          {/* Export buttons */}
          <button type="button" onClick={handleDownloadHtml} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">
            <Download className="h-4 w-4" />下載 HTML
          </button>
          <button type="button" onClick={() => { void handleDownloadDocx(); }} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">
            <Download className="h-4 w-4" />下載 DOCX
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">
            <Printer className="h-4 w-4" />列印 / PDF
          </button>
        </div>
      </div>

      {/* Risk warning for sale contracts */}
      {draft.contractType === 'sale' && (draft.manualReviewRequired || draft.riskNotes) && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm space-y-1">
          <div className="font-medium text-amber-700">⚠ 需人工覆核</div>
          {draft.riskNotes && <div className="text-text-primary">{draft.riskNotes}</div>}
        </div>
      )}

      {/* Content area: iframe or TipTap editor */}
      {isEditing ? (
        <ContractRichTextEditor
          initialHtml={editorMountHtmlRef.current}
          onChange={handleEditorChange}
        />
      ) : (
        <div className="rounded-xl border border-border-default overflow-hidden">
          <iframe
            srcDoc={hasEdits ? getFinalHtml() : previewHtml}
            className="w-full bg-white"
            style={{ height: '900px' }}
            title="契約草稿預覽"
          />
        </div>
      )}
    </div>
  );
}
