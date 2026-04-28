'use client';

import { Plus, Trash2 } from 'lucide-react';

import type {
  TranscriptIntakeAreaDetailDraft,
  TranscriptIntakeAreaDetailRow,
} from '@/lib/transcript-parse/intake-types';
import { PARKING_AREA_EMPTY_MESSAGE } from '@/lib/transcript-parse/area-detail-copy';

type RowKey =
  | 'buildingAreas'
  | 'landShareAreas'
  | 'parkingBuildingAreas'
  | 'parkingLandShareAreas';

interface TranscriptIntakeAreaDetailEditorProps {
  draft: TranscriptIntakeAreaDetailDraft;
  disabled?: boolean;
  onChange: (draft: TranscriptIntakeAreaDetailDraft) => void;
  onFocusEvidence?: (row: TranscriptIntakeAreaDetailRow) => void;
}

const inputCls =
  'w-full rounded border border-border-default bg-bg-primary px-2 py-1 text-xs text-text-primary ' +
  'focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60';

const thCls = 'px-2 py-2 text-left text-[11px] font-medium text-text-muted whitespace-nowrap';
const tdCls = 'px-2 py-1.5 align-top';

const SECTION_META: Record<RowKey, { title: string; empty: string }> = {
  buildingAreas: {
    title: '建物建築面積明細表',
    empty: '尚未擷取建物面積，可手動新增。',
  },
  landShareAreas: {
    title: '建物所屬土地持分面積明細表',
    empty: '尚未擷取土地持分，可手動新增。',
  },
  parkingBuildingAreas: {
    title: '車位建築面積明細表',
    empty: PARKING_AREA_EMPTY_MESSAGE,
  },
  parkingLandShareAreas: {
    title: '車位所屬土地持分面積明細表',
    empty: PARKING_AREA_EMPTY_MESSAGE,
  },
};

function newRow(section: RowKey): TranscriptIntakeAreaDetailRow {
  return {
    id: `${section}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: '',
    identifier: '',
    areaSqm: '',
    shareRatio: '',
    use: '',
    evidenceText: '',
    confidence: null,
  };
}

function updateRows(
  draft: TranscriptIntakeAreaDetailDraft,
  section: RowKey,
  rows: TranscriptIntakeAreaDetailRow[],
): TranscriptIntakeAreaDetailDraft {
  return {
    ...draft,
    [section]: rows,
  };
}

function updateRowField(
  row: TranscriptIntakeAreaDetailRow,
  field: keyof TranscriptIntakeAreaDetailRow,
  value: string,
): TranscriptIntakeAreaDetailRow {
  return {
    ...row,
    [field]: value,
  };
}

function sourceTrustLabel(sourceTrust: TranscriptIntakeAreaDetailRow['sourceTrust']): string {
  switch (sourceTrust) {
    case 'authoritative':
      return '正式來源';
    case 'reference_only':
      return '參考來源';
    case 'ignore':
      return '略過';
    case 'unknown':
      return '待確認';
    default:
      return '未標記';
  }
}

function sourceTrustTone(sourceTrust: TranscriptIntakeAreaDetailRow['sourceTrust']): string {
  switch (sourceTrust) {
    case 'authoritative':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
    case 'reference_only':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
    case 'ignore':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-600';
    default:
      return 'border-border-default bg-bg-tertiary text-text-muted';
  }
}

function SectionTable({
  section,
  rows,
  disabled,
  onRowsChange,
  onFocusEvidence,
}: {
  section: RowKey;
  rows: TranscriptIntakeAreaDetailRow[];
  disabled?: boolean;
  onRowsChange: (rows: TranscriptIntakeAreaDetailRow[]) => void;
  onFocusEvidence?: (row: TranscriptIntakeAreaDetailRow) => void;
}) {
  const meta = SECTION_META[section];

  return (
    <div className="rounded-md border border-border-default bg-bg-secondary">
      <div className="flex items-center justify-between gap-2 border-b border-border-default px-3 py-2">
        <h4 className="text-xs font-semibold text-text-primary">{meta.title}</h4>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRowsChange([...rows, newRow(section)])}
          className="inline-flex h-7 items-center gap-1 rounded border border-border-default px-2 text-[11px] text-text-secondary hover:bg-bg-primary disabled:opacity-50"
        >
          <Plus size={12} />
          新增
        </button>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border-default">
                <th className={thCls}>項目</th>
                <th className={thCls}>建號／地號</th>
                <th className={thCls}>用途／分區</th>
                <th className={thCls}>面積㎡</th>
                <th className={thCls}>持分</th>
                <th className={thCls}>來源</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b border-border-default/60">
                  <td className={tdCls}>
                    <input
                      className={inputCls}
                      disabled={disabled}
                      value={row.label}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = updateRowField(row, 'label', event.target.value);
                        onRowsChange(next);
                      }}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      className={inputCls}
                      disabled={disabled}
                      value={row.identifier}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = updateRowField(row, 'identifier', event.target.value);
                        onRowsChange(next);
                      }}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      className={inputCls}
                      disabled={disabled}
                      value={row.use}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = updateRowField(row, 'use', event.target.value);
                        onRowsChange(next);
                      }}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      className={inputCls}
                      disabled={disabled}
                      value={row.areaSqm}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = updateRowField(row, 'areaSqm', event.target.value);
                        onRowsChange(next);
                      }}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      className={inputCls}
                      disabled={disabled}
                      value={row.shareRatio}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = updateRowField(row, 'shareRatio', event.target.value);
                        onRowsChange(next);
                      }}
                    />
                  </td>
                  <td className={`${tdCls} min-w-[160px]`}>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className={`w-fit rounded border px-1.5 py-0.5 text-[10px] ${sourceTrustTone(row.sourceTrust)}`}>
                        {sourceTrustLabel(row.sourceTrust)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onFocusEvidence?.(row)}
                        className="max-w-[220px] truncate text-left text-[11px] text-accent hover:text-accent-hover"
                      >
                        {row.evidenceText || row.sourceDocumentName || '查看來源'}
                      </button>
                    </div>
                  </td>
                  <td className={tdCls}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                      className="rounded p-1 text-text-muted hover:bg-bg-primary hover:text-red-500 disabled:opacity-50"
                      title="刪除此列"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-text-muted">{meta.empty}</p>
      )}
    </div>
  );
}

export function TranscriptIntakeAreaDetailEditor({
  draft,
  disabled,
  onChange,
  onFocusEvidence,
}: TranscriptIntakeAreaDetailEditorProps) {
  const sections: RowKey[] = [
    'buildingAreas',
    'landShareAreas',
    'parkingBuildingAreas',
    'parkingLandShareAreas',
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <SectionTable
          key={section}
          section={section}
          rows={draft[section]}
          disabled={disabled}
          onFocusEvidence={(row) => onFocusEvidence?.(row)}
          onRowsChange={(rows) => onChange(updateRows(draft, section, rows))}
        />
      ))}
    </div>
  );
}
