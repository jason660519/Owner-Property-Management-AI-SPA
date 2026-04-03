// filepath: apps/superadmin/components/admin/properties/investigation-report/ConditionStatementForm.tsx
// 物件調查報告書 — 屋況說明書（現況揭露）
'use client';

import { Home } from 'lucide-react';
import type { InvestigationReport, PropertyConditionStatement } from './types';
import { CONDITION_STATEMENT_META } from './condition-statement-meta';

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
}

const textareaCls =
  'w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted resize-y min-h-[4.5rem]';

export function ConditionStatementForm({ report, onChange }: Props) {
  const cs = report.conditionStatement;

  function patch(p: Partial<PropertyConditionStatement>) {
    onChange({
      ...report,
      conditionStatement: { ...cs, ...p },
    });
  }

  const filled = CONDITION_STATEMENT_META.filter((s) => cs[s.key]?.trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Home size={18} className="text-accent shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-text-primary">屋況說明書</h4>
          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            供不動產說明書與客戶說明之用，請依看屋及賣方揭露據實填寫；列印時將置於「物件個案調查表」之後。未填欄位列印為「—」。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {CONDITION_STATEMENT_META.map((s) => (
          <div key={s.key} className="border border-border-default rounded-lg p-3 bg-bg-primary">
            <label className="block text-xs font-medium text-text-primary mb-1">{s.title}</label>
            <p className="text-[10px] text-text-muted mb-2">{s.hint}</p>
            <textarea
              value={cs[s.key]}
              onChange={(e) => patch({ [s.key]: e.target.value } as Partial<PropertyConditionStatement>)}
              placeholder="若無特殊情形可填「無」或留空。"
              rows={3}
              className={textareaCls}
            />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-muted">已填寫 {filled} / {CONDITION_STATEMENT_META.length} 項</p>
    </div>
  );
}
