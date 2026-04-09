'use client';

import { useState, useMemo } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/Badge';
import type { ModelRoleCatalogRow, RoleTag, RoleAssignment } from '@/lib/types/model-role-catalog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TagEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ModelRoleCatalogRow | null;
  allTags: RoleTag[];
  onSave: (provider: string, modelId: string, tagKeys: string[]) => Promise<void>;
  onCreateTag: (tagKey: string, tagLabel: string, description?: string) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Source display config
// ---------------------------------------------------------------------------

const SOURCE_CONFIG: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'default' }> = {
  ai_online: { label: '網路查詢', variant: 'info' },
  ai_offline: { label: 'API Response', variant: 'success' },
  manual: { label: '手動', variant: 'warning' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TagEditorSheet({ open, onOpenChange, row, allTags, onSave, onCreateTag }: TagEditorSheetProps) {
  // Manual tag selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // New custom tag form
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [creating, setCreating] = useState(false);

  // Sync selectedKeys when row changes
  const currentManualKeys = useMemo(() => {
    if (!row) return new Set<string>();
    return new Set(
      row.assignments.filter((a) => a.source === 'manual').map((a) => a.tag_key),
    );
  }, [row]);

  // Reset state when sheet opens with new row
  const handleOpenChange = (v: boolean) => {
    if (v && row) {
      setSelectedKeys(new Set(currentManualKeys));
      setDirty(false);
      setNewTagKey('');
      setNewTagLabel('');
    }
    onOpenChange(v);
  };

  // Group existing assignments by source
  const assignmentsBySource = useMemo(() => {
    if (!row) return new Map<string, RoleAssignment[]>();
    const m = new Map<string, RoleAssignment[]>();
    for (const a of row.assignments) {
      const arr = m.get(a.source) ?? [];
      arr.push(a);
      m.set(a.source, arr);
    }
    return m;
  }, [row]);

  // Tag label lookup
  const tagLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTags) m.set(t.tag_key, t.tag_label);
    return m;
  }, [allTags]);

  const toggleTag = (tagKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(tagKey)) next.delete(tagKey);
      else next.add(tagKey);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    try {
      await onSave(row.provider, row.modelId, Array.from(selectedKeys));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagKey.trim() || !newTagLabel.trim()) return;
    setCreating(true);
    try {
      const result = await onCreateTag(newTagKey.trim(), newTagLabel.trim());
      if (result) {
        setNewTagKey('');
        setNewTagLabel('');
      }
    } finally {
      setCreating(false);
    }
  };

  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary border-b border-border-default px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                編輯職責分類標籤
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {row.providerName} / {row.modelName}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded hover:bg-bg-tertiary text-text-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Existing AI classifications (read-only display) */}
          {(['ai_online', 'ai_offline'] as const).map((source) => {
            const items = assignmentsBySource.get(source);
            if (!items?.length) return null;
            const cfg = SOURCE_CONFIG[source];
            return (
              <div key={source}>
                <h4 className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
                  <Tag size={12} />
                  {cfg.label} 分類結果
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((a) => (
                    <Badge key={a.tag_key} variant={cfg.variant} size="sm">
                      {tagLabelMap.get(a.tag_key) ?? a.tag_key}
                      <span className="ml-1 opacity-60">
                        {Math.round(a.confidence * 100)}%
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Manual tag assignment (checkboxes) */}
          <div>
            <h4 className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
              <Tag size={12} />
              手動指定標籤
            </h4>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allTags
                .filter((t) => t.tag_key !== 'online_classification' && t.tag_key !== 'offline_classification')
                .map((tag) => (
                  <label
                    key={tag.tag_key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(tag.tag_key)}
                      onChange={() => toggleTag(tag.tag_key)}
                      className="rounded border-border-default"
                    />
                    <span className="text-xs text-text-primary flex-1">{tag.tag_label}</span>
                    {!tag.is_system && (
                      <span className="text-[10px] text-text-muted">自訂</span>
                    )}
                  </label>
                ))}
            </div>
          </div>

          {/* Create custom tag */}
          <div className="border-t border-border-default pt-4">
            <h4 className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
              <Plus size={12} />
              新增自訂標籤
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="標籤鍵值 (英文小寫+底線，如 my_tag)"
                value={newTagKey}
                onChange={(e) => setNewTagKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full px-2 py-1.5 text-xs rounded border border-border-default bg-bg-secondary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                placeholder="顯示名稱（如：我的自訂分類）"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-border-default bg-bg-secondary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={creating || !newTagKey.trim() || !newTagLabel.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '新增中…' : '新增標籤'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-primary border-t border-border-default px-4 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-xs rounded border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-secondary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
