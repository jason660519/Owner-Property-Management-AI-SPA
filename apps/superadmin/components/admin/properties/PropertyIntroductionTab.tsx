'use client';

import { PropertyDescriptionAIAssistant } from './PropertyDescriptionAIAssistant';

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
  return (
    <div className="space-y-5">
      <div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">物件介紹文案</h3>
          <p className="text-xs text-text-muted mt-1">
            可直接編輯。下方可使用 AI 協助產生草稿後再套用。
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="property-introduction-md" className="mb-1.5 block text-sm font-medium text-text-secondary">
          編輯區（Markdown 可存檔後於前台渲染）
        </label>
        <textarea
          id="property-introduction-md"
          rows={16}
          placeholder="輸入物件介紹，或使用下方 AI 撰稿…"
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
