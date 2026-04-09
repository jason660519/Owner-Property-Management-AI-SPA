'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ModelRoleCatalogRow, RoleTag } from '@/lib/types/model-role-catalog';

// ---------------------------------------------------------------------------
// Column helper
// ---------------------------------------------------------------------------

const col = createColumnHelper<ModelRoleCatalogRow>();

const HEADERS = [
  { en: 'Provider', zh: '公司名稱' },
  { en: 'Model Name', zh: '模型名稱' },
  { en: 'Version', zh: '版本型號' },
  { en: 'Status', zh: '模型狀態' },
  { en: 'Role Tags', zh: '職責分類標籤' },
] as const;

function meta(idx: number) {
  return { headerEn: HEADERS[idx].en, headerZh: HEADERS[idx].zh };
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  available: { variant: 'success' as const, label: '可用' },
  no_key: { variant: 'default' as const, label: '無金鑰' },
  invalid: { variant: 'error' as const, label: '無效' },
};

// Source abbreviation for tag badges
const SOURCE_LABEL: Record<string, string> = {
  ai_online: '網路',
  ai_offline: 'API',
  manual: '手動',
};

// ---------------------------------------------------------------------------
// Column factory
// ---------------------------------------------------------------------------

export interface CreateModelRoleColumnsDeps {
  roleTags: RoleTag[];
  onEditTags: (row: ModelRoleCatalogRow) => void;
}

export function createModelRoleColumns(
  deps: CreateModelRoleColumnsDeps,
): ColumnDef<ModelRoleCatalogRow, unknown>[] {
  const { roleTags, onEditTags } = deps;

  // Build tag_key -> tag_label lookup
  const tagLabelMap = new Map<string, string>();
  for (const t of roleTags) {
    tagLabelMap.set(t.tag_key, t.tag_label);
  }

  return [
    // 1. Provider
    col.accessor('providerName', {
      id: 'col-provider',
      meta: meta(0),
      cell: ({ getValue }) => (
        <span className="font-medium text-text-primary">{getValue()}</span>
      ),
    }) as ColumnDef<ModelRoleCatalogRow, unknown>,

    // 2. Model Name
    col.accessor('modelName', {
      id: 'col-model-name',
      meta: meta(1),
      cell: ({ getValue }) => (
        <span className="text-text-primary">{getValue()}</span>
      ),
    }) as ColumnDef<ModelRoleCatalogRow, unknown>,

    // 3. Version / Model ID
    col.accessor('version', {
      id: 'col-version',
      meta: meta(2),
      cell: ({ getValue, row }) => (
        <span className="font-mono text-xs text-text-muted" title={row.original.modelId}>
          {getValue()}
        </span>
      ),
    }) as ColumnDef<ModelRoleCatalogRow, unknown>,

    // 4. Status
    col.accessor('status', {
      id: 'col-status',
      meta: meta(3),
      cell: ({ getValue }) => {
        const status = getValue();
        const cfg = STATUS_CONFIG[status];
        return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
      },
    }) as ColumnDef<ModelRoleCatalogRow, unknown>,

    // 5. Role Tags
    col.display({
      id: 'col-role-tags',
      meta: meta(4),
      cell: ({ row }) => {
        const { assignments } = row.original;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {assignments.length === 0 && (
              <span className="text-xs text-text-muted italic">未分類</span>
            )}
            {assignments.map((a) => {
              const label = tagLabelMap.get(a.tag_key) ?? a.tag_key;
              const src = SOURCE_LABEL[a.source] ?? a.source;
              // Truncate long labels for table display
              const shortLabel = label.length > 10 ? label.slice(0, 10) + '…' : label;
              return (
                <Badge
                  key={`${a.tag_key}-${a.source}`}
                  variant="info"
                  size="sm"
                  title={`${label} (${src}, ${Math.round(a.confidence * 100)}%)`}
                >
                  {shortLabel}
                  <span className="ml-0.5 opacity-60 text-[9px]">{src}</span>
                </Badge>
              );
            })}
            <button
              type="button"
              onClick={() => onEditTags(row.original)}
              className="ml-1 p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
              title="編輯標籤"
            >
              <Pencil size={12} />
            </button>
          </div>
        );
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Default column widths (percentage)
// ---------------------------------------------------------------------------

export const MODEL_ROLE_CATALOG_INITIAL_WIDTHS = [12, 18, 22, 10, 38];
