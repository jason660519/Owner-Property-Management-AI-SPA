// filepath: project-progress/components/development-table/AddRowModal.tsx
// Extracted "Add custom row" modal from DevelopmentTab.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { normalizeRowIdInput } from './types';
import type { CustomProjectProgressRowPayload } from '../../types';

interface AddRowModalProps {
  open: boolean;
  onClose: () => void;
  existingRowIds: Set<string>;
  onAdd: (row: CustomProjectProgressRowPayload) => void;
}

export default function AddRowModal({ open, onClose, existingRowIds, onAdd }: AddRowModalProps) {
  const [draftRowId, setDraftRowId] = useState('');
  const [draftCategory, setDraftCategory] = useState('自訂 (Custom)');
  const [draftLocatedPage, setDraftLocatedPage] = useState('');
  const [draftFeatureName, setDraftFeatureName] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDraftRowId('');
    setDraftCategory('自訂 (Custom)');
    setDraftLocatedPage('');
    setDraftFeatureName('');
    setDraftError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(() => {
    const id = normalizeRowIdInput(draftRowId);
    if (!id) { setDraftError('請輸入 ID'); return; }
    if (existingRowIds.has(id)) { setDraftError(`ID 已存在：${id}`); return; }
    const name = draftFeatureName.trim();
    if (!name) { setDraftError('請輸入 Feature'); return; }
    const category = draftCategory.trim();
    if (!category) { setDraftError('請輸入 Category'); return; }

    onAdd({
      rowId: id,
      name,
      category,
      locatedPage: draftLocatedPage.trim() || undefined,
      percentage: 0,
    });
    resetForm();
  }, [draftRowId, draftCategory, draftFeatureName, draftLocatedPage, existingRowIds, onAdd, resetForm]);

  if (!open) return null;

  const inputCls =
    'w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-lg border border-border-default bg-bg-primary shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              新增自訂 Row
            </p>
            <p className="mt-0.5 text-xs text-text-muted truncate">
              這些 Row 只會儲存在你的設定（不會改到 roadmap.ts）
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="ml-3 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            關閉
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-id">ID</label>
              <input id="add-row-id" type="text" value={draftRowId} onChange={e => setDraftRowId(e.target.value)} className={inputCls} placeholder="例如：085 或 CUSTOM-1" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-category">Category</label>
              <input id="add-row-category" type="text" value={draftCategory} onChange={e => setDraftCategory(e.target.value)} className={inputCls} placeholder="例如：專案管理與工具 (Project Management)" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-feature">Feature</label>
            <input id="add-row-feature" type="text" value={draftFeatureName} onChange={e => setDraftFeatureName(e.target.value)} className={inputCls} placeholder="例如：Project Progress Dashboard — XXX" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-located-page">Located Page（可選）</label>
            <input id="add-row-located-page" type="text" value={draftLocatedPage} onChange={e => setDraftLocatedPage(e.target.value)} className={inputCls} placeholder="例如：superadmin/dashboard/project-progress" />
          </div>
          {draftError && <p className="text-xs text-red-500">{draftError}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border-light px-4 py-3 bg-bg-secondary/60">
          <button type="button" onClick={handleClose} className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary">
            取消
          </button>
          <button type="button" onClick={handleSubmit} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5" />
            新增
          </button>
        </div>
      </div>
    </div>
  );
}
