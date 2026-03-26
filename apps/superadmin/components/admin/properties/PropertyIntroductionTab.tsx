'use client';

import { useRef, type ChangeEvent } from 'react';
import { Download, FileUp } from 'lucide-react';
import { PropertyDescriptionAIAssistant } from './PropertyDescriptionAIAssistant';

function slugForFilename(title: string, fallbackId: string): string {
  const t = title.trim().replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, '-').slice(0, 48);
  return t || fallbackId.slice(0, 8);
}

export interface PropertyIntroductionTabProps {
  propertyId: string;
  listingType: 'sale' | 'rental';
  title: string;
  propertyType: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  livingRooms: number;
  parkingSpaces: number;
  price: number;
  monthlyRent: number;
  addressCity: string;
  addressDistrict: string;
  addressStreet: string;
  addressNumber: string;
  addressFloor: string;
  addressUnit: string;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function PropertyIntroductionTab({
  propertyId,
  listingType,
  title,
  propertyType,
  area,
  bedrooms,
  bathrooms,
  livingRooms,
  parkingSpaces,
  price,
  monthlyRent,
  addressCity,
  addressDistrict,
  addressStreet,
  addressNumber,
  addressFloor,
  addressUnit,
  description,
  onDescriptionChange,
}: PropertyIntroductionTabProps) {
  const mdInputRef = useRef<HTMLInputElement>(null);

  function handleImportMd(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const nameOk = file.name.toLowerCase().endsWith('.md');
    const typeOk =
      !file.type ||
      file.type === 'text/markdown' ||
      file.type === 'text/x-markdown' ||
      file.type === 'text/plain';

    if (!nameOk && !typeOk) {
      window.alert('請選擇 .md 檔（Markdown）');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onDescriptionChange(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      window.alert('無法讀取檔案');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleDownloadMd() {
    const body = description ?? '';
    const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `物件介紹-${slugForFilename(title, propertyId)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">物件介紹文案</h3>
          <p className="text-xs text-text-muted mt-1">
            可直接編輯、匯入 .md 取代目前內容、或下載為 Markdown。下方可使用 AI 協助產生草稿後再套用。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={mdInputRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={handleImportMd}
          />
          <button
            type="button"
            onClick={() => mdInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            <FileUp className="h-3.5 w-3.5" />
            匯入 .md
          </button>
          <button
            type="button"
            onClick={handleDownloadMd}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            <Download className="h-3.5 w-3.5" />
            下載 物件介紹.md
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="property-introduction-md" className="mb-1.5 block text-sm font-medium text-text-secondary">
          編輯區（Markdown 可存檔後於前台渲染）
        </label>
        <textarea
          id="property-introduction-md"
          rows={16}
          placeholder="輸入物件介紹，或使用「匯入 .md」／下方 AI 撰稿…"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full resize-y rounded-md border border-border-default bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none font-mono leading-relaxed min-h-[200px]"
          spellCheck={false}
        />
      </div>

      <PropertyDescriptionAIAssistant
        listingType={listingType}
        title={title}
        propertyType={propertyType}
        area={area}
        bedrooms={bedrooms}
        bathrooms={bathrooms}
        livingRooms={livingRooms}
        parkingSpaces={parkingSpaces}
        price={price}
        monthlyRent={monthlyRent}
        addressCity={addressCity}
        addressDistrict={addressDistrict}
        addressStreet={addressStreet}
        addressNumber={addressNumber}
        addressFloor={addressFloor}
        addressUnit={addressUnit}
        description={description}
        onDescriptionChange={onDescriptionChange}
        hideDescriptionTextarea
      />
    </div>
  );
}
