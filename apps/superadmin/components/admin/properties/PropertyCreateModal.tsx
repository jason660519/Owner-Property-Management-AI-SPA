// filepath: apps/superadmin/components/admin/properties/PropertyCreateModal.tsx
// created: 2026-03-02 | creator: Claude Sonnet 4.6
'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { X, Loader2, Building2, Key, ChevronDown, Lock } from 'lucide-react';
import { createProperty, updateProperty } from '@/lib/actions/properties';
import { PropertyMediaSection } from './PropertyMediaSection';
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type CreatePropertyInput,
  type UpdatePropertyInput,
  type OwnerOption,
} from '@/lib/types/properties';
import { TAIWAN_CITIES, getDistrictsByCity } from '@/lib/data/taiwan-address';

type ActiveTab = 'edit' | 'photos' | 'blog' | 'transcript' | 'title' | 'contract';

function composeAddress(parts: {
  city?: string;
  district?: string;
  street?: string;
  number?: string;
  floor?: string;
  unit?: string;
}): string {
  return [parts.city, parts.district, parts.street, parts.number, parts.floor, parts.unit]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Dropdown + editable numeric input combo */
function NumberComboBox({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [open, setOpen] = useState(false);
  const [localText, setLocalText] = useState(String(value));
  const focused = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (!focused.current) setLocalText(String(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className="flex">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localText}
          onFocus={() => { focused.current = true; }}
          onBlur={() => {
            focused.current = false;
            const cleaned = localText.replace(/[^0-9]/g, '');
            const num = cleaned === '' ? min : Math.max(min, parseInt(cleaned, 10));
            setLocalText(String(num));
            onChange(num);
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            setLocalText(raw);
            if (raw !== '') onChange(Math.max(min, parseInt(raw, 10)));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); return; }
            if (['Backspace', 'Delete', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
            if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
            if (!/^[0-9]$/.test(e.key)) e.preventDefault();
          }}
          className="w-full border border-border-default rounded-l-md px-2 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 border border-l-0 border-border-default rounded-r-md px-1.5 bg-bg-primary hover:bg-bg-secondary text-text-secondary transition-colors focus:outline-none focus:border-accent"
          tabIndex={-1}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-primary border border-border-default rounded-md shadow-lg max-h-48 overflow-y-auto">
          {options.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { onChange(n); setLocalText(String(n)); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                value === n ? 'bg-accent/10 text-accent font-medium' : 'text-text-primary hover:bg-bg-secondary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const statusLabelsMap: Record<string, string> = {
  for_sale: '出售中',
  for_rent: '出租中',
  collecting_rent: '收租中',
  sold: '賀成交（出售）',
  rented: '賀成交（出租）',
  pending: '待审',
  expired: '逾期案（下架沒換手）',
  invalid: '無效案（下架已換手）',
};

const TAB_LABELS: Record<ActiveTab, string> = {
  edit: '物件基本資訊',
  photos: '物件照片',
  blog: '部落格',
  transcript: '謄本',
  title: '權狀',
  contract: '合約',
};

interface PropertyCreateModalProps {
  owners: OwnerOption[];
  onClose: () => void;
  onCreated: () => void;
  pageMode?: boolean;
}

export function PropertyCreateModal({ owners, onClose, onCreated }: PropertyCreateModalProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ActiveTab>('edit');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // After first creation, these become available for media tabs
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);
  const [savedPropertyType, setSavedPropertyType] = useState<'sale' | 'rental'>('sale');
  const [savedOwnerId, setSavedOwnerId] = useState<string>('');

  // Property type (sale / rental)
  const [propertyListingType, setPropertyListingType] = useState<'sale' | 'rental'>('sale');

  // Owner
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? '');

  // Form state
  const [title, setTitle] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressFloor, setAddressFloor] = useState('');
  const [addressUnit, setAddressUnit] = useState('');
  const [status, setStatus] = useState('pending');
  const districtOptions = useMemo(() => getDistrictsByCity(addressCity), [addressCity]);
  const [price, setPrice] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [leaseTerm, setLeaseTerm] = useState(12);
  const [propertyType, setPropertyType] = useState('');
  const [areaInput, setAreaInput] = useState('');
  const areaNum = (() => {
    if (areaInput.trim() === '') return 0;
    const n = Number(areaInput);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [livingRooms, setLivingRooms] = useState(0);
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [description, setDescription] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPropertyId]);

  function handleClose() {
    if (savedPropertyId) onCreated();
    onClose();
  }

  function handleSubmit() {
    setFeedback(null);

    const composedAddress = composeAddress({
      city: addressCity || undefined,
      district: addressDistrict || undefined,
      street: addressStreet || undefined,
      number: addressNumber || undefined,
      floor: addressFloor || undefined,
      unit: addressUnit || undefined,
    });

    if (!composedAddress && !title.trim()) {
      setFeedback({ type: 'error', message: '請填寫物件名稱或地址' });
      return;
    }
    if (!ownerId) {
      setFeedback({ type: 'error', message: '請選擇所有權人' });
      return;
    }

    // If already created, use updateProperty instead
    if (savedPropertyId) {
      const updateInput: UpdatePropertyInput = {
        title: title.trim() || composedAddress,
        address: composedAddress || title.trim(),
        addressCity: addressCity || undefined,
        addressDistrict: addressDistrict || undefined,
        addressStreet: addressStreet || undefined,
        addressNumber: addressNumber || undefined,
        addressFloor: addressFloor || undefined,
        addressUnit: addressUnit || undefined,
        status,
        propertyType: propertyType || undefined,
        area: areaInput.trim() === '' ? null : (() => { const n = Number(areaInput); return Number.isFinite(n) && n >= 0 ? n : null; })(),
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        livingRooms: livingRooms || null,
        parkingSpaces: parkingSpaces || null,
      };
      if (description.trim()) updateInput.description = description;
      if (savedPropertyType === 'sale') updateInput.price = price;
      else { updateInput.monthlyRent = monthlyRent; updateInput.leaseTerm = leaseTerm; }

      startTransition(async () => {
        const result = await updateProperty(savedPropertyId, savedPropertyType, updateInput);
        if (result.success) {
          setFeedback({ type: 'success', message: '基本資訊已更新' });
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      });
      return;
    }

    // First time: create
    const input: CreatePropertyInput = {
      ownerId,
      title: title.trim() || composedAddress,
      address: composedAddress || title.trim(),
      addressCity: addressCity || undefined,
      addressDistrict: addressDistrict || undefined,
      addressStreet: addressStreet || undefined,
      addressNumber: addressNumber || undefined,
      addressFloor: addressFloor || undefined,
      addressUnit: addressUnit || undefined,
      status,
      propertyType: propertyType || undefined,
      area: areaInput.trim() === '' ? null : (() => { const n = Number(areaInput); return Number.isFinite(n) && n >= 0 ? n : null; })(),
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      livingRooms: livingRooms || null,
      parkingSpaces: parkingSpaces || null,
    };
    if (description.trim()) input.description = description;
    if (propertyListingType === 'sale') input.price = price;
    else { input.monthlyRent = monthlyRent; input.leaseTerm = leaseTerm; }

    startTransition(async () => {
      const result = await createProperty(propertyListingType, input);
      if (result.success && result.propertyId) {
        setSavedPropertyId(result.propertyId);
        setSavedPropertyType(propertyListingType);
        setSavedOwnerId(ownerId);
        setFeedback({ type: 'success', message: '物件已建立！現在可以上傳照片與文件。' });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  const isMediaTab = activeTab !== 'edit';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-bg-secondary border-b border-border-default px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                (savedPropertyType || propertyListingType) === 'sale'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-blue-500/10 text-blue-500'
              }`}
            >
              {(savedPropertyType || propertyListingType) === 'sale' ? <Building2 size={18} /> : <Key size={18} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">新增物件</h3>
              {savedPropertyId && (
                <p className="text-xs text-text-muted font-mono">{savedPropertyId.slice(0, 8)}...</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 bg-bg-secondary border-b border-border-default px-6 flex gap-1 flex-wrap">
          {(['edit', 'photos', 'blog', 'transcript', 'title', 'contract'] as ActiveTab[]).map((tab) => {
            const locked = tab !== 'edit' && !savedPropertyId;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => { if (!locked) setActiveTab(tab); }}
                title={locked ? '請先儲存物件基本資訊' : undefined}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1 ${
                  locked
                    ? 'border-transparent text-text-muted cursor-not-allowed opacity-50'
                    : activeTab === tab
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {locked && <Lock size={11} />}
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {feedback && (
            <div
              className={`p-3 rounded-lg text-sm ${
                feedback.type === 'success'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Media tabs — only available after property is created */}
          {isMediaTab && savedPropertyId && (
            <PropertyMediaSection
              propertyId={savedPropertyId}
              propertyType={savedPropertyType}
              ownerId={savedOwnerId}
              mode={activeTab as 'photos' | 'transcript' | 'title' | 'contract' | 'blog'}
            />
          )}

          {/* Edit form */}
          {activeTab === 'edit' && (
          <>
          {/* Row 0: Listing type — lock once created */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              物件性質
              {savedPropertyId && <span className="ml-2 text-xs text-text-muted font-normal">（已建立後無法變更）</span>}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!!savedPropertyId}
                onClick={() => setPropertyListingType('sale')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  propertyListingType === 'sale'
                    ? 'bg-green-500/10 border-green-500 text-green-500'
                    : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <Building2 size={15} />
                出售（Sale）
              </button>
              <button
                type="button"
                disabled={!!savedPropertyId}
                onClick={() => setPropertyListingType('rental')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  propertyListingType === 'rental'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                    : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <Key size={15} />
                出租（Rental）
              </button>
            </div>
          </div>

          {/* Row 1: Owner + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                所有權人 <span className="text-red-400">*</span>
                {savedPropertyId && <span className="ml-1 text-xs text-text-muted font-normal">（已建立後無法變更）</span>}
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={!!savedPropertyId}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">請選擇所有權人</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">狀態</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabelsMap[s] || s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">物件名稱</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：敦南華夏四房+車位"
              className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
            />
          </div>

          {/* Address */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-secondary">地址（台灣分區，從大到小）</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-text-muted mb-1">縣市</span>
                <select
                  value={addressCity}
                  onChange={(e) => { setAddressCity(e.target.value); setAddressDistrict(''); }}
                  className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">請選擇縣市</option>
                  {TAIWAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <span className="block text-xs text-text-muted mb-1">區</span>
                <select
                  value={addressDistrict}
                  onChange={(e) => setAddressDistrict(e.target.value)}
                  disabled={!addressCity}
                  className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent disabled:opacity-50"
                >
                  <option value="">請選擇區</option>
                  {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <span className="block text-xs text-text-muted mb-1">路 / 段 / 街</span>
              <input
                type="text"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="敦化南路一段、安和路..."
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs text-text-muted mb-1">門牌號碼</span>
                <input type="text" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="295號" className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted" />
              </div>
              <div>
                <span className="block text-xs text-text-muted mb-1">樓層</span>
                <input type="text" value={addressFloor} onChange={(e) => setAddressFloor(e.target.value)} placeholder="3F" className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted" />
              </div>
              <div>
                <span className="block text-xs text-text-muted mb-1">單位號碼</span>
                <input type="text" value={addressUnit} onChange={(e) => setAddressUnit(e.target.value)} placeholder="之2" className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted" />
              </div>
            </div>
            {(addressCity || addressStreet || addressNumber) && (
              <p className="text-xs text-text-muted">
                預覽：{composeAddress({ city: addressCity, district: addressDistrict, street: addressStreet, number: addressNumber, floor: addressFloor, unit: addressUnit }) || '—'}
              </p>
            )}
          </div>

          {/* Price / Rent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {propertyListingType === 'sale' ? (
                <>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">售價 (NT$)</label>
                  <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent" />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">月租金 (NT$)</label>
                  <input type="number" min={0} value={monthlyRent} onChange={(e) => setMonthlyRent(Number(e.target.value))} className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent" />
                </>
              )}
            </div>
            {propertyListingType === 'rental' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">租期 (月)</label>
                <input type="number" min={1} value={leaseTerm} onChange={(e) => setLeaseTerm(Number(e.target.value))} className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
            )}
          </div>

          {/* Property type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">物件類型</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent">
              <option value="">請選擇物件類型</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* 格局 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">格局</label>
            <div className="grid grid-cols-4 gap-4">
              <div><span className="block text-xs text-text-muted mb-1">房</span><NumberComboBox value={bedrooms} onChange={setBedrooms} /></div>
              <div><span className="block text-xs text-text-muted mb-1">廳</span><NumberComboBox value={livingRooms} onChange={setLivingRooms} /></div>
              <div><span className="block text-xs text-text-muted mb-1">衛</span><NumberComboBox value={bathrooms} onChange={setBathrooms} /></div>
              <div><span className="block text-xs text-text-muted mb-1">車位</span><NumberComboBox value={parkingSpaces} onChange={setParkingSpaces} /></div>
            </div>
          </div>

          {/* Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">總面積 (平方公尺)</label>
              <input type="number" min={0} value={areaInput} onChange={(e) => setAreaInput(e.target.value)} placeholder="0" className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">總坪數</label>
              <div className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-tertiary text-text-primary text-sm" aria-live="polite">
                {(areaNum * 0.3025).toFixed(2)} 坪
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">描述</label>
            <textarea rows={3} placeholder="輸入物件描述..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted resize-y" />
          </div>
          </>
          )}
        </div>

        {/* Footer — only on edit tab */}
        {activeTab === 'edit' && (
          <div className="shrink-0 bg-bg-secondary border-t border-border-default px-6 py-4 flex items-center justify-between gap-3 rounded-b-lg">
            {savedPropertyId ? (
              <p className="text-xs text-green-500">✓ 物件已建立，可切換至其他頁籤上傳照片與文件</p>
            ) : (
              <p className="text-xs text-text-muted">儲存後即可上傳照片與文件</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors text-sm disabled:opacity-50"
              >
                {savedPropertyId ? '完成' : '取消'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-5 py-2 bg-accent text-white hover:bg-accent-hover rounded-md transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? (savedPropertyId ? '儲存中...' : '建立中...') : (savedPropertyId ? '儲存變更' : '新增物件')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
