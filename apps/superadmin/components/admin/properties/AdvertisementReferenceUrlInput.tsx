'use client';

interface AdvertisementReferenceUrlInputProps {
  referenceUrl: string;
  referenceUrlInput: string;
  onInputChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function AdvertisementReferenceUrlInput({
  referenceUrl,
  referenceUrlInput,
  onInputChange,
  onApply,
  onClear,
}: AdvertisementReferenceUrlInputProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border-default bg-bg-primary p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">參考網頁風格</p>
        <p className="mt-1 text-xs leading-5 text-text-muted">貼上任何你喜歡的物件廣告網址，AI 將分析其設計風格，為你的物件生成相似視覺風格的銷售頁面。</p>
      </div>

      <p className="text-xs text-amber-500/80">⚠️ 注意：部分 SPA 網站無法由伺服器端抓取，將自動改用風格預設生成。</p>

      {referenceUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
          <span className="flex-1 truncate text-xs text-text-secondary">{referenceUrl}</span>
          <button onClick={onClear} className="rounded px-1 py-0.5 text-xs text-text-muted transition-colors hover:bg-bg-tertiary">
            清除
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={referenceUrlInput}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onApply()}
          placeholder="https://a0405142777.wixsite.com/108-en-lease1"
          className="flex-1 rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button onClick={onApply} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover">
          套用
        </button>
      </div>
    </div>
  );
}