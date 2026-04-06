// filepath: apps/superadmin/components/admin/properties/investigation-report/ConditionStatementForm.tsx
// 物件調查報告書 — 屋況說明書（現況揭露）
'use client';

import { Fragment } from 'react';
import { Home } from 'lucide-react';
import type { GovConditionItem, InvestigationReport, PropertyConditionStatement } from './types';
import { GOV_CONDITION_ITEMS } from './condition-statement-meta';

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
}

const inputCls =
  'w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted';

const noteCustomCls =
  'w-full border-0 border-t border-border-default rounded-none px-1 py-0.5 bg-transparent text-text-primary text-[11px] focus:outline-none placeholder-text-muted resize-y';

export function ConditionStatementForm({ report, onChange }: Props) {
  const cs = report.conditionStatement;
  const inferredAddress = [report.region, report.addressStreet, report.addressNumber]
    .filter(Boolean)
    .join(' ')
    .trim();
  const govAddressValue = cs.govAddress || inferredAddress;

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
          <input
            value={govAddressValue}
            onChange={(e) => patch({ govAddress: e.target.value })}
            placeholder="例：台北市中山區民權東路三段100號8樓之1"
            className={inputCls}
          />
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
                        type="radio"
                        name={`gov-item-${itemNo}`}
                        checked={value.answer === 'yes'}
                        onChange={() => patchGovItem(itemNo, { answer: 'yes' })}
                        className="mt-0"
                      />
                    </label>
                  </td>
                  <td className="px-0 py-0 border-b border-r border-border-default align-middle">
                    <label className="w-full h-full min-h-[52px] flex items-center justify-center cursor-pointer">
                      <input
                        type="radio"
                        name={`gov-item-${itemNo}`}
                        checked={value.answer === 'no'}
                        onChange={() => patchGovItem(itemNo, { answer: 'no' })}
                        className="mt-0"
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

      <div>
        <label className="block text-[11px] font-medium text-text-primary mb-1">委託人簽章</label>
        <input
          value={cs.govSigner}
          onChange={(e) => patch({ govSigner: e.target.value })}
          placeholder="例：王小明"
          className={inputCls}
        />
      </div>

      <p className="text-[10px] text-text-muted">
        已填寫 {filled} / {GOV_CONDITION_ITEMS.length} 項
      </p>
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
