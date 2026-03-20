// filepath: apps/superadmin/components/admin/properties/investigation-report/NotesSelector.tsx
// 物件調查報告書 — 產權相關注意事項選擇 (matching Excel 秘書-注意事項)
'use client';

import { PREDEFINED_NOTES, STANDARD_CLAUSES } from './constants';
import type { InvestigationReport } from './types';
import type { PropertyItem } from '@/lib/types/properties';

// Document attachment checklist item
interface DocItem {
  label: string;
  auto: boolean; // auto-detected from property data
}

function buildDocChecklist(property?: PropertyItem): DocItem[] {
  const has = (flag: boolean | undefined) => !!flag;
  return [
    // Main content
    { label: '產權調查篇', auto: false },
    { label: '物件現況調查篇', auto: false },
    { label: '位置與格局圖', auto: false },
    { label: '圖片說明書', auto: false },
    // Attachments
    { label: '土地權狀影本', auto: has(property?.hasTitleDoc) },
    { label: '建物權狀影本', auto: has(property?.hasTitleDoc) },
    { label: '土地謄本', auto: has(property?.hasTranscript) },
    { label: '建物謄本', auto: has(property?.hasTranscript) },
    { label: '都市使用分區證明', auto: false },
    { label: '建築改良物使用執照', auto: false },
    // Others
    { label: '地籍圖', auto: false },
    { label: '建物平面圖', auto: false },
    { label: '海砂檢測報告', auto: false },
    { label: '輻射檢測報告', auto: false },
    { label: '住戶規約', auto: false },
    { label: '車位平面圖', auto: false },
  ];
}

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
  property?: PropertyItem;
}

export function NotesSelector({ report, onChange, property }: Props) {
  const docChecklist = buildDocChecklist(property);
  function toggleNote(id: string) {
    const next = report.selectedNotes.includes(id)
      ? report.selectedNotes.filter((n) => n !== id)
      : [...report.selectedNotes, id];
    onChange({ ...report, selectedNotes: next });
  }

  const mainNotes = PREDEFINED_NOTES.filter((n) => n.category === 'main');
  const extraNotes = PREDEFINED_NOTES.filter((n) => n.category === 'extra');

  return (
    <div className="space-y-5">
      {/* 附件清單（自動連動已上傳文件） */}
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-1">附件清單</h4>
        <p className="text-[10px] text-text-muted mb-2">
          已上傳的謄本/權狀會自動標示
          <span className="text-green-500 ml-1">●</span>；其餘可手動確認。
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {docChecklist.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs ${
                item.auto
                  ? 'border-green-500/30 bg-green-500/5 text-green-600'
                  : 'border-border-default text-text-secondary'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.auto ? 'bg-green-500' : 'bg-border-default'}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* 標準條款（一～七） — 固定顯示，不可勾選 */}
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2">
          標準買賣雙方義務條款
        </h4>
        <p className="text-[10px] text-text-muted mb-3">
          以下條款為標準條文，將自動列印於報告書簽名頁。
        </p>
        <div className="space-y-2">
          {STANDARD_CLAUSES.map((clause) => (
            <div
              key={clause.number}
              className="flex gap-2 px-3 py-2 rounded-md bg-bg-tertiary border border-border-default/50"
            >
              <span className="text-xs font-medium text-accent shrink-0 w-5">
                {clause.number}
              </span>
              <p className="text-xs text-text-secondary leading-relaxed">
                {clause.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 主要注意事項 — 可勾選 */}
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2">
          主要注意事項
          <span className="text-xs text-text-muted font-normal ml-2">
            （勾選適用項目，將轉載至報告書）
          </span>
        </h4>
        <div className="space-y-1.5">
          {mainNotes.map((note) => (
            <label
              key={note.id}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                report.selectedNotes.includes(note.id)
                  ? 'bg-accent/5 border-accent/30'
                  : 'bg-bg-primary border-border-default hover:border-text-muted'
              }`}
            >
              <input
                type="checkbox"
                checked={report.selectedNotes.includes(note.id)}
                onChange={() => toggleNote(note.id)}
                className="mt-0.5 w-3.5 h-3.5 accent-accent shrink-0"
              />
              <span className="text-xs text-text-primary leading-relaxed">
                {note.text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 額外注意事項 — 可勾選 */}
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2">
          額外注意事項
          <span className="text-xs text-text-muted font-normal ml-2">
            （依物件狀況勾選）
          </span>
        </h4>
        <div className="space-y-1.5">
          {extraNotes.map((note) => (
            <label
              key={note.id}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                report.selectedNotes.includes(note.id)
                  ? 'bg-accent/5 border-accent/30'
                  : 'bg-bg-primary border-border-default hover:border-text-muted'
              }`}
            >
              <input
                type="checkbox"
                checked={report.selectedNotes.includes(note.id)}
                onChange={() => toggleNote(note.id)}
                className="mt-0.5 w-3.5 h-3.5 accent-accent shrink-0"
              />
              <span className="text-xs text-text-primary leading-relaxed">
                {note.text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 自訂注意事項 */}
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-2">
          自訂注意事項
        </h4>
        <textarea
          value={report.customNote}
          onChange={(e) => onChange({ ...report, customNote: e.target.value })}
          placeholder="如有上述清單以外之注意事項，請在此輸入…"
          rows={3}
          className="w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted resize-y"
        />
      </div>

      {/* Summary */}
      <div className="text-xs text-text-muted pt-1">
        已選擇 {report.selectedNotes.length} 項注意事項
        {report.customNote.trim() ? '（含自訂 1 項）' : ''}
      </div>
    </div>
  );
}
