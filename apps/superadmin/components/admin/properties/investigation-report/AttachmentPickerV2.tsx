// Investigation report — redesigned attachment picker with all categories
'use client';

import { useMemo, useCallback } from 'react';
import { FileText, ImageIcon, FileSearch, LayoutGrid } from 'lucide-react';
import type { InvestigationReport, AttachmentSelection } from './types';
import type { PropertyItem, PropertyDocumentItem, PropertyPhotoItem } from '@/lib/types/properties';
import {
  ATTACHMENT_CATEGORIES,
  getCategoriesByGroup,
  GROUP_LABELS,
  type CategoryDef,
  type CategoryGroup,
  type AvailabilityContext,
} from './attachment-categories';

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
  documents: PropertyDocumentItem[];
  photos: PropertyPhotoItem[];
  property?: PropertyItem;
}

const GROUP_ICONS: Record<CategoryGroup, React.ReactNode> = {
  report: <FileSearch size={14} className="text-accent shrink-0" />,
  existing_docs: <FileText size={14} className="text-accent shrink-0" />,
  data_driven: <LayoutGrid size={14} className="text-accent shrink-0" />,
  media: <ImageIcon size={14} className="text-accent shrink-0" />,
};

/** Derive a stable ID for a category definition */
function categoryId(def: CategoryDef, docs: PropertyDocumentItem[]): string {
  if (def.category === 'document' && def.documentTypes?.length) {
    // For document categories, use the first matching document ID
    const match = docs.find((d) => def.documentTypes!.includes(d.documentType ?? ''));
    return match ? match.id : `doc:${def.documentTypes[0]}`;
  }
  return def.category;
}

/** Get all matching document IDs for a document-type category */
function getMatchingDocIds(def: CategoryDef, docs: PropertyDocumentItem[]): string[] {
  if (!def.documentTypes?.length) return [];
  return docs.filter((d) => def.documentTypes!.includes(d.documentType ?? '')).map((d) => d.id);
}

export function AttachmentPickerV2({ report, onChange, documents, photos, property }: Props) {
  const ctx: AvailabilityContext = useMemo(
    () => ({ report, property, documents, photos }),
    [report, property, documents, photos],
  );

  const groups = useMemo(() => getCategoriesByGroup(), []);

  // Build current selections lookup
  const selections = report.attachmentSelections ?? [];
  const selectionSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of selections) {
      if (s.enabled) set.add(`${s.category}:${s.id}`);
    }
    return set;
  }, [selections]);

  const isSelected = useCallback(
    (cat: string, id: string) => selectionSet.has(`${cat}:${id}`),
    [selectionSet],
  );

  const updateSelections = useCallback(
    (next: AttachmentSelection[]) => {
      onChange({ ...report, attachmentSelections: next });
    },
    [report, onChange],
  );

  const toggleItem = useCallback(
    (def: CategoryDef) => {
      const ids =
        def.category === 'document'
          ? getMatchingDocIds(def, documents)
          : [def.category];

      const allSelected = ids.every((id) => isSelected(def.category, id));
      const current = [...selections];

      if (allSelected) {
        // Remove all matching
        const next = current.filter(
          (s) => !(s.category === def.category && ids.includes(s.id)),
        );
        updateSelections(next);
      } else {
        // Add missing
        const next = [...current];
        for (const id of ids) {
          if (!isSelected(def.category, id)) {
            const doc = documents.find((d) => d.id === id);
            next.push({
              category: def.category,
              id,
              label: def.label + (doc ? ` - ${doc.documentName}` : ''),
              url: doc?.url,
              enabled: true,
            });
          }
        }
        updateSelections(next);
      }
    },
    [selections, documents, isSelected, updateSelections],
  );

  const toggleGroup = useCallback(
    (groupDefs: CategoryDef[]) => {
      const available = groupDefs.filter((d) => d.isAvailable(ctx));
      const allIds = available.flatMap((def) =>
        def.category === 'document'
          ? getMatchingDocIds(def, documents).map((id) => ({ cat: def.category, id, def }))
          : [{ cat: def.category, id: def.category, def }],
      );
      const allSelected = allIds.every(({ cat, id }) => isSelected(cat, id));

      if (allSelected) {
        // Deselect all in group
        const groupCats = new Set(available.map((d) => d.category));
        const groupDocIds = new Set(available.flatMap((d) => getMatchingDocIds(d, documents)));
        const next = selections.filter(
          (s) =>
            !(groupCats.has(s.category) &&
              (s.category !== 'document' || groupDocIds.has(s.id))),
        );
        updateSelections(next);
      } else {
        // Select all in group
        const next = [...selections];
        for (const { cat, id, def } of allIds) {
          if (!isSelected(cat, id)) {
            const doc = documents.find((d) => d.id === id);
            next.push({
              category: cat,
              id,
              label: def.label + (doc ? ` - ${doc.documentName}` : ''),
              url: doc?.url,
              enabled: true,
            });
          }
        }
        updateSelections(next);
      }
    },
    [ctx, selections, documents, isSelected, updateSelections],
  );

  const totalSelected = selections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-1">選取列印附件</h4>
        <p className="text-[10px] text-text-muted leading-relaxed">
          勾選要一併列入調查報告的附件項目。點擊「列印報告書 + 附件」後，所有勾選項目將合併為一份文件列印。
        </p>
      </div>

      {(Object.keys(groups) as CategoryGroup[]).map((groupKey) => {
        const defs = groups[groupKey];
        if (defs.length === 0) return null;
        const availableDefs = defs.filter((d) => d.isAvailable(ctx));
        const unavailableDefs = defs.filter((d) => !d.isAvailable(ctx));

        return (
          <div key={groupKey}>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                {GROUP_ICONS[groupKey]}
                {GROUP_LABELS[groupKey]}
                <span className="text-text-muted font-normal">
                  ({availableDefs.length}/{defs.length})
                </span>
              </h5>
              {availableDefs.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleGroup(defs)}
                  className="text-[10px] text-accent hover:underline"
                >
                  全選 / 取消
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {defs.map((def) => {
                const available = def.isAvailable(ctx);
                const ids =
                  def.category === 'document'
                    ? getMatchingDocIds(def, documents)
                    : [def.category];
                const checked = ids.length > 0 && ids.every((id) => isSelected(def.category, id));
                const docCount =
                  def.category === 'document' ? ids.length : undefined;
                const photoCount =
                  def.category === 'photo_sheet' ? photos.length : undefined;

                return (
                  <label
                    key={`${def.category}:${def.documentTypes?.[0] ?? def.category}`}
                    className={`flex items-start gap-2.5 px-3 py-2 rounded-md border transition-colors ${
                      !available
                        ? 'opacity-40 cursor-not-allowed bg-bg-tertiary border-border-default'
                        : checked
                          ? 'bg-accent/5 border-accent/30 cursor-pointer'
                          : 'bg-bg-primary border-border-default hover:border-text-muted cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!available}
                      onChange={() => available && toggleItem(def)}
                      className="mt-0.5 w-3.5 h-3.5 accent-accent shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-text-primary block">
                        {def.label}
                        {docCount != null && docCount > 0 && (
                          <span className="text-text-muted ml-1">({docCount} 份)</span>
                        )}
                        {photoCount != null && (
                          <span className="text-text-muted ml-1">({photoCount} 張)</span>
                        )}
                      </span>
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        {available ? def.description : '尚無資料'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Supplementary notes */}
      <div>
        <h5 className="text-xs font-semibold text-text-secondary mb-2">附加說明</h5>
        <textarea
          value={report.reportAttachmentSupplement}
          onChange={(e) => onChange({ ...report, reportAttachmentSupplement: e.target.value })}
          placeholder="可補充其他應一併交付或說明之事項…"
          rows={3}
          className="w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted resize-y"
        />
      </div>

      <p className="text-[10px] text-text-muted">
        已勾選 {totalSelected} 項附件
        {report.reportAttachmentSupplement?.trim() ? '，並含附加說明' : ''}
      </p>
    </div>
  );
}
