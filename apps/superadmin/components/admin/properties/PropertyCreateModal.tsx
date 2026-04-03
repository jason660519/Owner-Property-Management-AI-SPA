// filepath: apps/superadmin/components/admin/properties/PropertyCreateModal.tsx
// created: 2026-03-02 | creator: Claude Sonnet 4.6
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { X, Loader2, Building2, Key } from 'lucide-react';
import { createProperty } from '@/lib/actions/properties';
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type CreatePropertyInput,
} from '@/lib/types/properties';
import { NumberComboBox } from './NumberComboBox';

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
  onCreated: (propertyId?: string) => void;
}

export function PropertyCreateModal({ onClose, onCreated }: PropertyCreateModalProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '請填寫物件名稱';
    if (!propertyType) newErrors.propertyType = '請選擇物件類型';
    
    if (propertyListingType === 'sale') {
      if (price <= 0) newErrors.price = '售價需大於 0';
    } else {
      if (monthlyRent <= 0) newErrors.monthlyRent = '月租金需大於 0';
      if (leaseTerm <= 0) newErrors.leaseTerm = '租期需至少 1 個月';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    setFeedback(null);
    if (!validate()) return;

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
        onCreated(result.propertyId);
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
              className={`w-full border rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted ${
                errors.title ? 'border-red-500' : 'border-border-default'
              }`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
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
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className={`w-full border rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent ${
                      errors.price ? 'border-red-500' : 'border-border-default'
                    }`}
                  />
                  {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">月租金 (NT$)</label>
                  <input
                    type="number"
                    min={0}
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className={`w-full border rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent ${
                      errors.monthlyRent ? 'border-red-500' : 'border-border-default'
                    }`}
                  />
                  {errors.monthlyRent && <p className="mt-1 text-xs text-red-500">{errors.monthlyRent}</p>}
                </>
              )}
            </div>
            {propertyListingType === 'rental' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">租期 (月)</label>
                <input
                  type="number"
                  min={1}
                  value={leaseTerm}
                  onChange={(e) => setLeaseTerm(Number(e.target.value))}
                  className={`w-full border rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent ${
                    errors.leaseTerm ? 'border-red-500' : 'border-border-default'
                  }`}
                />
                {errors.leaseTerm && <p className="mt-1 text-xs text-red-500">{errors.leaseTerm}</p>}
              </div>
            )}
          </div>

          {/* Property type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">物件類型</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent ${
                errors.propertyType ? 'border-red-500' : 'border-border-default'
              }`}
            >
              <option value="">請選擇物件類型</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.propertyType && <p className="mt-1 text-xs text-red-500">{errors.propertyType}</p>}
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
