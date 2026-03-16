// filepath: apps/superadmin/components/admin/properties/PropertyCreateModal.tsx
// created: 2026-03-02 | creator: Claude Sonnet 4.6
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { X, Loader2, Building2, Key, ChevronDown } from 'lucide-react';
import { createProperty } from '@/lib/actions/properties';
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type CreatePropertyInput,
} from '@/lib/types/properties';

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

interface PropertyCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function PropertyCreateModal({ onClose, onCreated }: PropertyCreateModalProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Property type (sale / rental)
  const [propertyListingType, setPropertyListingType] = useState<'sale' | 'rental'>('sale');

  // Form state
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('pending');
  const [price, setPrice] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [leaseTerm, setLeaseTerm] = useState(12);
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [livingRooms, setLivingRooms] = useState(0);
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [description, setDescription] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSubmit() {
    setFeedback(null);

    if (!title.trim()) {
      setFeedback({ type: 'error', message: '請填寫物件名稱' });
      return;
    }

    const input: CreatePropertyInput = {
      title: title.trim(),
      status,
      propertyType: propertyType || undefined,
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
      if (result.success) {
        onCreated();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="shrink-0 bg-bg-secondary border-b border-border-default px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                propertyListingType === 'sale'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-blue-500/10 text-blue-500'
              }`}
            >
              {propertyListingType === 'sale' ? <Building2 size={18} /> : <Key size={18} />}
            </div>
            <h3 className="text-lg font-bold text-text-primary">新增物件</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {feedback && (
            <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/20">
              {feedback.message}
            </div>
          )}

          {/* Row 0: Listing type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">物件性質</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPropertyListingType('sale')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm font-medium transition-colors ${
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
                onClick={() => setPropertyListingType('rental')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm font-medium transition-colors ${
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

          {/* Row 1: Status */}
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

          {/* Address note */}
          <p className="text-xs text-text-muted bg-bg-tertiary border border-border-default rounded-md px-3 py-2">
            地址將在進入編輯頁，上傳謄本並完成 OCR 解析後自動填入。
          </p>

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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">描述</label>
            <textarea rows={3} placeholder="輸入物件描述..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted resize-y" />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-bg-secondary border-t border-border-default px-6 py-4 flex items-center justify-between gap-3 rounded-b-lg">
          <p className="text-xs text-text-muted">建立後請至編輯頁上傳照片與文件</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors text-sm disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-5 py-2 bg-accent text-white hover:bg-accent-hover rounded-md transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? '建立中...' : '新增物件'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
