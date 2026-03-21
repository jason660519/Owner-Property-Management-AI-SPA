'use client';

import { useState } from 'react';
import { CheckSquare, Clock, ScrollText, Square } from 'lucide-react';
import type { PropertyItem } from '@/lib/types/properties';
import { CONTRACT_TEMPLATE_OPTIONS, CATEGORY_BADGE_CLASSES, type ContractTemplateId } from './ContractTemplateConfig';
import { ContractDraftPanel } from './ContractDraftPanel';

interface Props {
  property: PropertyItem;
}

export function ContractDraftPreviewSection({ property }: Props) {
  const [selectedIds, setSelectedIds] = useState<ContractTemplateId[]>([]);

  function toggleTemplate(id: ContractTemplateId) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  return (
    <section className="space-y-5">
      {/* Template selector */}
      <div className="rounded-2xl border border-border-default bg-bg-primary p-5 space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <ScrollText className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">選擇合約套版範本</h3>
        </div>
        <p className="text-sm text-text-secondary">
          可複選多份合約範本，每份合約獨立填寫資料並產生預覽。生成後仍需人工覆核，不具法律效力。
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRACT_TEMPLATE_OPTIONS.map((template) => {
            const isSelected = selectedIds.includes(template.id);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => toggleTemplate(template.id)}
                className={[
                  'relative rounded-xl border-2 p-4 text-left transition-all',
                  isSelected
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-border-default bg-bg-primary hover:border-border-active hover:bg-bg-hover',
                ].join(' ')}
              >
                {/* Selection indicator */}
                <div className="absolute right-3 top-3">
                  {isSelected
                    ? <CheckSquare className="h-5 w-5 text-accent" />
                    : <Square className="h-5 w-5 text-text-muted" />}
                </div>

                {/* Category badge */}
                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE_CLASSES[template.category]}`}>
                  {template.category}
                </span>

                <div className="mt-2 pr-6">
                  <div className="text-sm font-semibold text-text-primary">{template.label}</div>
                  <div className="mt-1 text-xs text-text-secondary leading-relaxed">{template.description}</div>
                </div>

                {!template.available && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    套版功能開發中
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedIds.length === 0 && (
          <p className="text-center text-sm text-text-muted py-1">請點選上方範本以開始套版</p>
        )}
      </div>

      {/* Per-template panels — rendered in selection order */}
      {selectedIds.map((templateId) => {
        const template = CONTRACT_TEMPLATE_OPTIONS.find(t => t.id === templateId)!;

        if (!template.available) {
          return (
            <div key={templateId} className="rounded-2xl border border-border-default bg-bg-primary p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-text-muted" />
                <h4 className="font-semibold text-text-primary">{template.label}</h4>
                <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs text-text-muted">開發中</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                「{template.label}」套版功能即將推出，敬請期待。
              </p>
              <p className="mt-1 text-xs text-text-muted">參考範本：{template.sourceFile}</p>
            </div>
          );
        }

        return (
          <ContractDraftPanel
            key={templateId}
            property={property}
            templateId={templateId}
            templateLabel={template.label}
            contractType={template.contractType}
          />
        );
      })}
    </section>
  );
}
