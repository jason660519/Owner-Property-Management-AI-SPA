'use client';

import type { ReactNode } from 'react';
import { CheckCircle2, FileText, Layers3, Rocket, Send } from 'lucide-react';

interface PropertyAdvertisementBuilderProps {
  propertyType: 'sale' | 'rental';
  selectedStyleLabel: string;
  platformLabel: string;
  hasReferenceUrl: boolean;
  selectedSectionCount: number;
  sectionSelectionContent: ReactNode;
  styleSelectionContent: ReactNode;
  draftGenerationContent: ReactNode;
  exportContent: ReactNode;
}

const STEP_ITEMS = [
  {
    id: 'content',
    stepLabel: 'Step 1',
    title: '選擇內容區塊',
    description: '先確認這次廣告要使用哪些素材，後續生成與輸出都以這份內容組合為主。',
    icon: Layers3,
  },
  {
    id: 'style',
    stepLabel: 'Step 2',
    title: '選擇廣告風格',
    description: '先決定視覺與文案語氣，再決定是否要引用參考網址。',
    icon: FileText,
  },
  {
    id: 'draft',
    stepLabel: 'Step 3',
    title: '生成草稿',
    description: '這一階段先保留舊的生成資料流，後續再收斂成 canonical draft。',
    icon: Rocket,
  },
  {
    id: 'export',
    stepLabel: 'Step 4',
    title: '輸出與發佈',
    description: '生成完成後，再選擇本站頁面或外部平台輸出。',
    icon: Send,
  },
] as const;

export function PropertyAdvertisementBuilder({
  propertyType,
  selectedStyleLabel,
  platformLabel,
  hasReferenceUrl,
  selectedSectionCount,
  sectionSelectionContent,
  styleSelectionContent,
  draftGenerationContent,
  exportContent,
}: PropertyAdvertisementBuilderProps) {
  const propertyLabel = propertyType === 'sale' ? '銷售物件' : '出租物件';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border-default bg-gradient-to-br from-[#f8efe7] via-[#fbf7f2] to-[#eef3f7] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">Advertisement Workflow</p>
            <h2 className="text-2xl font-semibold text-text-primary">物件廣告 builder</h2>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              這個流程先以內容為主，再決定風格與輸出平台。第一張工單先完成版面骨架與導引，既有生成與發佈能力仍保留在下方各 step 中。
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">物件類型</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{propertyLabel}</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">預設內容組合</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{selectedSectionCount} 個區塊</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">目前風格</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{selectedStyleLabel}</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">輸出焦點</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{platformLabel}</p>
              <p className="mt-1 text-xs text-text-muted">{hasReferenceUrl ? '已設定參考網址' : '使用風格預設模式'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-4">
        {STEP_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="rounded-xl border border-border-default bg-bg-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{item.stepLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{item.title}</p>
                </div>
                <span className="rounded-full bg-accent/10 p-2 text-accent">
                  <Icon size={16} />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-text-muted">{item.description}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border-default bg-bg-secondary p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-accent/10 p-2 text-accent">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Phase 1 Scope</p>
            <p className="mt-1 text-sm text-text-secondary">
              這次先完成版面重排與操作導引，尚未改動 canonical draft 資料模型。現有 variant-aware 生成、URL query restore、Blogger / Supabase 輸出能力都維持原樣。
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border-default bg-bg-secondary p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Step 1</p>
          <h3 className="mt-1 text-lg font-semibold text-text-primary">選擇內容區塊</h3>
          <p className="mt-1 text-sm text-text-secondary">先確認這次廣告要吃哪些資料。builder 會依物件欄位、文件與謄本解析狀態動態判斷可用性。</p>
        </div>
        {sectionSelectionContent}
      </section>

      <section className="space-y-4 rounded-2xl border border-border-default bg-bg-secondary p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Step 2</p>
          <h3 className="mt-1 text-lg font-semibold text-text-primary">選擇廣告風格</h3>
          <p className="mt-1 text-sm text-text-secondary">先保留既有樣式列與參考網址輸入，但語意改為 builder 的第二步。</p>
        </div>
        {styleSelectionContent}
      </section>

      <section className="space-y-4 rounded-2xl border border-border-default bg-bg-secondary p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Step 3</p>
          <h3 className="mt-1 text-lg font-semibold text-text-primary">生成草稿</h3>
          <p className="mt-1 text-sm text-text-secondary">本階段先將草稿概念獨立出來，真正的 canonical draft action 會在後續票卡接手。</p>
        </div>
        {draftGenerationContent}
      </section>

      <section className="space-y-4 rounded-2xl border border-border-default bg-bg-secondary p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Step 4</p>
          <h3 className="mt-1 text-lg font-semibold text-text-primary">輸出與發佈</h3>
          <p className="mt-1 text-sm text-text-secondary">平台選擇與既有發布面板先移到最後一步，下一階段再改成 export cards。</p>
        </div>
        {exportContent}
      </section>
    </div>
  );
}