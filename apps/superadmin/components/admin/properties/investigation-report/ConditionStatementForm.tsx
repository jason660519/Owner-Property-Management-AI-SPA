// filepath: apps/superadmin/components/admin/properties/investigation-report/ConditionStatementForm.tsx
// 物件調查報告書 — 屋況說明書（現況揭露）
'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Printer, CloudUpload, Loader2, Eye, Trash2, FileText } from 'lucide-react';
import type { GovConditionItem, InvestigationReport, PropertyConditionStatement } from './types';
import { GOV_CONDITION_ITEMS, renderNoteWithChecks } from './condition-statement-meta';
import {
  listConditionStatementPdfs,
  getConditionStatementPdfUrl,
  deleteConditionStatementPdf,
} from '@/lib/actions/investigationReport';
import type { ConditionStatementPdfFile } from '@/lib/actions/investigationReport';

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
  propertyId?: string;
}

const inputCls =
  'w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const noteCustomCls =
  'w-full border-0 border-t border-border-default rounded-none px-1 py-0.5 bg-transparent text-text-primary text-[11px] focus:outline-none placeholder-text-muted resize-y';

export function ConditionStatementForm({ report, onChange, propertyId }: Props) {
  const cs = report.conditionStatement;
  const inferredAddress = [report.region, report.addressStreet, report.addressNumber]
    .filter(Boolean)
    .join(' ')
    .trim();
  /** 與物件基本資料一致；舊資料若基本資料為空則沿用曾存下的 govAddress */
  const resolvedAddress =
    inferredAddress.trim() || cs.govAddress.trim() || '—';

  function patch(p: Partial<PropertyConditionStatement>) {
    onChange({
      ...report,
      conditionStatement: { ...cs, ...p },
    });
  }

  function patchGovItem(
    itemNo: number,
    next: { answer?: '' | 'yes' | 'no'; note?: string; checkedBoxes?: number[] },
  ) {
    patch({
      govItems: cs.govItems.map((item) =>
        item.itemNo === itemNo
          ? {
              ...item,
              answer: next.answer ?? item.answer,
              note: next.note ?? item.note,
              checkedBoxes: next.checkedBoxes ?? item.checkedBoxes,
            }
          : item,
      ),
    });
  }

  // Build the print HTML — all values are escaped via esc(), safe from XSS
  const buildHtml = useCallback(() => {
    const addr = resolvedAddress;
    const rows = GOV_CONDITION_ITEMS.map((item, idx) => {
      const row = cs.govItems.find((r) => r.itemNo === idx + 1);
      const tpl = renderNoteWithChecks(item.noteHint, row?.checkedBoxes ?? []);
      const custom = row?.note?.trim() ?? '';
      const note = [tpl, custom].filter(Boolean).join('\n');
      return `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="white-space:pre-line;">${esc(item.title)}</td>
        <td style="text-align:center;font-size:12px;">${row?.answer === 'yes' ? '■' : '□'}</td>
        <td style="text-align:center;font-size:12px;">${row?.answer === 'no' ? '■' : '□'}</td>
        <td style="white-space:pre-wrap;">${note.trim() ? esc(note) : ''}</td>
      </tr>`;
    });

    const allRows = rows.join('');
    const disclaimer = `<div style="font-size:9px;color:#333;margin-top:16px;line-height:1.6;">
      <p style="font-weight:600;color:#000;margin-bottom:2px;">注意事項：</p>
      <p>１．本表為賣方依現況於 ${esc(report.createdDate || '—')} 時填載，若有填載不實或日後屋況、分管協議變更時，其買賣雙方權利義務仍應依買賣契約書或法令規定為準。</p>
      <p>２．賣方依法應負瑕疵擔保責任；標的物現況若於交屋前有變更時，應如實告知買方。</p>
      <p>３．賣方於簽定買賣合約前已再次逐一確認本標的物現況說明書，確實無誤。</p>
    </div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>標的物現況說明書</title>
      <style>
        @page { size: A4; margin: 15mm 12mm; }
        * { box-sizing: border-box; }
        html, body { background:#fff !important; color:#222 !important; margin:0; padding:8px; font-family: "Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif; }
        table { width:100%; border-collapse:collapse; table-layout:fixed; }
        th, td { border:1px solid #999; padding:4px 6px; font-size:10px; vertical-align:top; word-wrap:break-word; overflow-wrap:break-word; }
        th { background:#f5f5f5 !important; color:#222 !important; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tr { page-break-inside:avoid; }
      </style></head><body>
      <h2 style="font-size:18px;text-align:center;letter-spacing:4px;margin:0 0 4px;">標的物現況說明書（成屋）</h2>
      <p style="font-size:10px;color:#555;text-align:center;margin:0 0 10px;">地址：${esc(addr)}</p>
      <table>
        <colgroup>
          <col style="width:5%;" />
          <col style="width:37%;" />
          <col style="width:5%;" />
          <col style="width:5%;" />
          <col style="width:48%;" />
        </colgroup>
        <thead><tr>
          <th>項次</th>
          <th>內容</th>
          <th>是</th>
          <th>否</th>
          <th>備註說明</th>
        </tr></thead>
        <tbody>${allRows}</tbody>
        <tfoot><tr>
          <td colspan="5" style="border:none;padding:6px 0 0;font-size:10px;">
            <div style="display:flex;justify-content:space-between;">
              <span>賣方簽章：＿＿＿＿＿＿＿＿</span>
              <span>簽立日期：　　年　　月　　日</span>
              <span>買方簽章：＿＿＿＿＿＿＿＿</span>
              <span>簽立日期：　　年　　月　　日</span>
            </div>
          </td>
        </tr></tfoot>
      </table>
      ${disclaimer}
    </body></html>`;
  }, [cs, report.createdDate, resolvedAddress]);

  const handlePrint = useCallback(() => {
    const html = buildHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.print();
        URL.revokeObjectURL(url);
      };
    }
  }, [buildHtml]);

  // ── Cloud PDF list ──
  const [pdfFiles, setPdfFiles] = useState<ConditionStatementPdfFile[]>([]);

  const loadPdfList = useCallback(async () => {
    if (!propertyId) return;
    const { data } = await listConditionStatementPdfs(propertyId);
    setPdfFiles(data);
  }, [propertyId]);

  useEffect(() => { loadPdfList(); }, [loadPdfList]);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const handleSaveToCloud = useCallback(async () => {
    if (!propertyId || uploading) return;
    setUploading(true);
    setUploadMsg('正在產生 PDF 並上傳...');
    try {
      const html = buildHtml();
      const origin = window.location.origin;

      // Inject auto-generate + auto-upload script into a clean white popup
      const autoScript = `
        <div id="pdf-status" style="position:fixed;top:0;left:0;right:0;background:#4f46e5;color:#fff;padding:12px 20px;font-size:15px;z-index:9999;text-align:center;font-family:sans-serif;">
          ⏳ 正在產生 PDF 並上傳至雲端...
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
        <script>
          window.addEventListener('load', async function() {
            const bar = document.getElementById('pdf-status');
            try {
              // Hide status bar during capture
              bar.style.display = 'none';

              var blob = await html2pdf()
                .set({
                  margin: [15, 12, 15, 12],
                  image: { type: 'jpeg', quality: 0.92 },
                  html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                  pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                })
                .from(document.body)
                .outputPdf('blob');

              bar.style.display = 'block';
              bar.textContent = '⏳ 正在上傳...';

              var fd = new FormData();
              fd.append('file', blob, 'condition-statement.pdf');
              fd.append('propertyId', '${propertyId}');
              var res = await fetch('${origin}/api/documents/upload-condition-pdf', { method: 'POST', body: fd });
              var data = await res.json();

              if (res.ok) {
                bar.textContent = '✅ 上傳成功！視窗將自動關閉...';
                bar.style.background = '#16a34a';
                if (window.opener) window.opener.postMessage({ type: 'pdf-uploaded' }, '*');
                setTimeout(function() { window.close(); }, 2000);
              } else {
                bar.textContent = '❌ 上傳失敗：' + (data.error || '未知錯誤');
                bar.style.background = '#dc2626';
              }
            } catch(e) {
              bar.style.display = 'block';
              bar.textContent = '❌ 錯誤：' + (e.message || String(e));
              bar.style.background = '#dc2626';
            }
          });
        <\/script>`;

      const fullHtml = html.replace('</body>', autoScript + '</body>');
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Listen for upload completion from popup
      const handleMessage = (e: MessageEvent) => {
        if (e.data?.type === 'pdf-uploaded') {
          setUploadMsg('已儲存至雲端');
          setUploading(false);
          loadPdfList();
          setTimeout(() => setUploadMsg(null), 3000);
          window.removeEventListener('message', handleMessage);
          URL.revokeObjectURL(url);
        }
      };
      window.addEventListener('message', handleMessage);

      // Timeout fallback: stop loading state after 30s
      setTimeout(() => {
        setUploading(false);
        window.removeEventListener('message', handleMessage);
        URL.revokeObjectURL(url);
      }, 30000);
    } catch (err) {
      setUploadMsg(`錯誤：${err instanceof Error ? err.message : String(err)}`);
      setUploading(false);
    }
  }, [buildHtml, propertyId, uploading, loadPdfList]);

  const handlePreviewPdf = async (path: string) => {
    const { url, error } = await getConditionStatementPdfUrl(path);
    if (error || !url) return alert(`無法取得連結：${error}`);
    window.open(url, '_blank');
  };

  const handleDeletePdf = async (path: string) => {
    if (!confirm('確定要刪除此 PDF？')) return;
    const { error } = await deleteConditionStatementPdf(path);
    if (error) return alert(`刪除失敗：${error}`);
    loadPdfList();
  };

  const filled = cs.govItems.filter(
    (item) =>
      item.answer !== '' ||
      item.note.trim() ||
      (item.checkedBoxes && item.checkedBoxes.length > 0),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Home size={18} className="text-accent shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-text-primary">標的物現況說明書（成屋）</h4>
          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            依政府版型調整。請依屋主揭露與現場實況逐項勾選「是／否」，並於備註補充說明。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium text-text-primary mb-1">地址</label>
          <p className="text-[10px] text-text-muted mb-1 leading-relaxed">
            與「物件基本資料」地址相同，此處僅供預覽與列印。
            {propertyId ? (
              <>
                {' '}
                <Link
                  href={`/superadmin/properties/${propertyId}/edit?tab=edit`}
                  className="text-accent hover:underline"
                >
                  前往編輯地址
                </Link>
              </>
            ) : null}
          </p>
          <div
            className="w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-tertiary text-text-primary text-xs min-h-[30px] flex items-center"
            title={resolvedAddress !== '—' ? resolvedAddress : undefined}
          >
            {resolvedAddress !== '—' ? (
              <span className="select-all">{resolvedAddress}</span>
            ) : (
              <span className="text-text-muted">請先在「物件基本資料」填寫區域、路街與門牌</span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-primary mb-1">簽立日期</label>
          <input
            type="date"
            value={cs.govSignedDate}
            onChange={(e) => patch({ govSignedDate: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="border border-border-default rounded-lg overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '40%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '45%' }} />
          </colgroup>
          <thead>
            <tr className="bg-bg-tertiary text-[11px] font-semibold">
              <th className="px-2 py-2 text-center border-b border-r border-border-default">
                項次
              </th>
              <th className="px-2 py-2 text-left border-b border-r border-border-default">內容</th>
              <th className="px-2 py-2 text-center border-b border-r border-border-default">是</th>
              <th className="px-2 py-2 text-center border-b border-r border-border-default">否</th>
              <th className="px-2 py-2 text-left border-b border-border-default">備註說明</th>
            </tr>
          </thead>
          <tbody>
            {GOV_CONDITION_ITEMS.map((item, index) => {
              const itemNo = index + 1;
              const value: GovConditionItem = cs.govItems.find((row) => row.itemNo === itemNo) ?? {
                itemNo,
                answer: '',
                note: '',
                checkedBoxes: [],
              };
              return (
                <tr key={itemNo} className="align-top">
                  <td className="px-2 py-2 text-center text-[11px] border-b border-r border-border-default">
                    {itemNo}
                  </td>
                  <td className="px-2 py-2 text-[11px] leading-5 border-b border-r border-border-default whitespace-pre-line">
                    {item.title}
                  </td>
                  <td className="px-0 py-0 border-b border-r border-border-default align-middle">
                    <label className="w-full h-full min-h-[52px] flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.answer === 'yes'}
                        onChange={() =>
                          patchGovItem(itemNo, { answer: value.answer === 'yes' ? '' : 'yes' })
                        }
                        className="w-4 h-4 accent-accent cursor-pointer"
                      />
                    </label>
                  </td>
                  <td className="px-0 py-0 border-b border-r border-border-default align-middle">
                    <label className="w-full h-full min-h-[52px] flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.answer === 'no'}
                        onChange={() =>
                          patchGovItem(itemNo, { answer: value.answer === 'no' ? '' : 'no' })
                        }
                        className="w-4 h-4 accent-accent cursor-pointer"
                      />
                    </label>
                  </td>
                  <td className="p-0 border-b border-border-default">
                    <InteractiveNoteCell
                      noteHint={item.noteHint}
                      note={value.note}
                      checkedBoxes={value.checkedBoxes ?? []}
                      onNoteChange={(n) => patchGovItem(itemNo, { note: n })}
                      onCheckedChange={(cb) => patchGovItem(itemNo, { checkedBoxes: cb })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] leading-relaxed text-text-muted border-t border-border-default pt-3">
        <p className="font-medium text-text-primary mb-1">注意事項：</p>
        <p>１．本表為賣方依現況於 {report.createdDate || '____年____月____日'} 時填載，若有填載不實或日後屋況、分管協議變更時，其買賣雙方權利義務仍應依買賣契約書或法令規定為準。</p>
        <p>２．賣方依法應負瑕疵擔保責任；標的物現況若於交屋前有變更時，應如實告知買方。</p>
        <p>３．賣方於簽定買賣合約前已再次逐一確認本標的物現況說明書，確實無誤。</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-text-primary mb-1">賣方簽章</label>
          <input
            value={cs.govSigner}
            onChange={(e) => patch({ govSigner: e.target.value })}
            placeholder="例：王小明"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-primary mb-1">賣方簽章日期</label>
          <input
            type="date"
            value={cs.govSignedDate}
            onChange={(e) => patch({ govSignedDate: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-text-primary mb-1">買方簽章</label>
          <input
            value={cs.govBuyerSigner ?? ''}
            onChange={(e) => patch({ govBuyerSigner: e.target.value })}
            placeholder="例：陳大華"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-primary mb-1">買方簽章日期</label>
          <input
            type="date"
            value={cs.govBuyerSignedDate ?? ''}
            onChange={(e) => patch({ govBuyerSignedDate: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted">
          已填寫 {filled} / {GOV_CONDITION_ITEMS.length} 項
        </p>
        <div className="flex items-center gap-2">
          {uploadMsg && (
            <span className={`text-[11px] ${uploadMsg.startsWith('已') ? 'text-green-500' : 'text-red-400'}`}>
              {uploadMsg}
            </span>
          )}
          {propertyId && (
            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              {uploading ? '產生中...' : '儲存 PDF 到雲端'}
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
          >
            <Printer size={14} />
            預覽列印
          </button>
        </div>
      </div>

      {/* Cloud PDF history */}
      {propertyId && pdfFiles.length > 0 && (
        <div className="border border-border-default rounded-lg p-3 space-y-2">
          <h5 className="text-[11px] font-semibold text-text-primary flex items-center gap-1.5">
            <FileText size={13} />
            雲端 PDF 紀錄（{pdfFiles.length}）
          </h5>
          <ul className="space-y-1">
            {pdfFiles.map((f) => (
              <li
                key={f.path}
                className="flex items-center justify-between text-[11px] text-text-secondary py-1 px-2 rounded hover:bg-bg-secondary"
              >
                <span className="truncate mr-2">
                  {f.name}
                  {f.createdAt && (
                    <span className="text-text-muted ml-2">
                      {new Date(f.createdAt).toLocaleString('zh-TW')}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePreviewPdf(f.path)}
                    className="p-1 rounded hover:bg-accent/10 text-accent"
                    title="預覽"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePdf(f.path)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                    title="刪除"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Interactive note cell: renders noteHint with clickable □ checkboxes ──

function InteractiveNoteCell({
  noteHint,
  note,
  checkedBoxes,
  onNoteChange,
  onCheckedChange,
}: {
  noteHint: string;
  note: string;
  checkedBoxes: number[];
  onNoteChange: (v: string) => void;
  onCheckedChange: (v: number[]) => void;
}) {
  if (!noteHint) {
    return (
      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={2}
        placeholder="備註說明"
        className="w-full min-h-[3.5rem] border-0 rounded-none px-1.5 py-1 bg-transparent text-text-primary text-[11px] focus:outline-none placeholder-text-muted resize-y"
      />
    );
  }

  // Split noteHint by □ to identify checkbox positions
  const parts = noteHint.split('□');
  const totalCheckboxes = parts.length - 1;

  const handleToggle = (idx: number) => {
    const next = new Set(checkedBoxes);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    onCheckedChange(Array.from(next).sort((a, b) => a - b));
  };

  return (
    <div className="px-1.5 py-1">
      {/* Template with interactive checkboxes */}
      <div className="text-[11px] leading-5 text-text-secondary whitespace-pre-wrap">
        {parts.map((textPart, i) => (
          <Fragment key={i}>
            {textPart}
            {i < totalCheckboxes && (
              <label className="inline-flex items-center cursor-pointer align-middle mx-0.5">
                <input
                  type="checkbox"
                  checked={checkedBoxes.includes(i)}
                  onChange={() => handleToggle(i)}
                  className="w-3.5 h-3.5 accent-accent cursor-pointer"
                />
              </label>
            )}
          </Fragment>
        ))}
      </div>
      {/* Custom text area */}
      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={1}
        placeholder="附加說明..."
        className={noteCustomCls}
      />
    </div>
  );
}
