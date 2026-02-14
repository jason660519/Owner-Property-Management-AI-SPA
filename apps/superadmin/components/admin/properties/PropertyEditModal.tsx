// filepath: apps/superadmin/components/admin/properties/PropertyEditModal.tsx
// created: 2026-02-14 | creator: Claude Opus 4.6
'use client';

import { useState, useTransition } from 'react';
import { X, Loader2, Building2, Key } from 'lucide-react';
import { updateProperty } from '@/lib/actions/properties';
import {
  SALE_STATUSES,
  RENTAL_STATUSES,
  type PropertyItem,
  type UpdatePropertyInput,
} from '@/lib/types/properties';

const saleStatusLabels: Record<string, string> = {
  available: '可售 (available)',
  pending: '待審 (pending)',
  sold: '已售 (sold)',
  archived: '已封存 (archived)',
};

const rentalStatusLabels: Record<string, string> = {
  vacant: '空置 (vacant)',
  occupied: '已租 (occupied)',
  maintenance: '維修中 (maintenance)',
  archived: '已封存 (archived)',
};

interface PropertyEditModalProps {
  property: PropertyItem;
  onClose: () => void;
  onSaved: () => void;
}

export function PropertyEditModal({ property, onClose, onSaved }: PropertyEditModalProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Form state
  const [title, setTitle] = useState(property.title);
  const [address, setAddress] = useState(property.address);
  const [status, setStatus] = useState(property.status);
  const [price, setPrice] = useState(property.price ?? 0);
  const [monthlyRent, setMonthlyRent] = useState(property.monthlyRent ?? 0);
  const [leaseTerm, setLeaseTerm] = useState(12);
  const [propertyType, setPropertyType] = useState(property.propertyType ?? '');
  const [area, setArea] = useState(property.area ?? 0);
  const [bedrooms, setBedrooms] = useState(property.bedrooms ?? 0);
  const [bathrooms, setBathrooms] = useState(property.bathrooms ?? 0);
  const [description, setDescription] = useState('');

  // Load description from property if available (details.description is not in PropertyItem,
  // so we initialize empty; the server action will merge with existing JSONB)

  const statusOptions = property.type === 'sale' ? SALE_STATUSES : RENTAL_STATUSES;
  const statusLabels = property.type === 'sale' ? saleStatusLabels : rentalStatusLabels;

  function handleSubmit() {
    setFeedback(null);

    const input: UpdatePropertyInput = {
      title,
      address,
      status,
      propertyType: propertyType || undefined,
      area: area || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
    };

    if (description.trim()) {
      input.description = description;
    }

    if (property.type === 'sale') {
      input.price = price;
    } else {
      input.monthlyRent = monthlyRent;
      input.leaseTerm = leaseTerm;
    }

    startTransition(async () => {
      const result = await updateProperty(property.id, property.type, input);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        // Brief delay so user sees success, then close
        setTimeout(() => {
          onSaved();
          onClose();
        }, 600);
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-secondary border-b border-border-default px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                property.type === 'sale'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-blue-500/10 text-blue-500'
              }`}
            >
              {property.type === 'sale' ? <Building2 size={18} /> : <Key size={18} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">編輯物件</h3>
              <p className="text-xs text-text-muted font-mono">{property.id.slice(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {/* Feedback */}
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

          {/* Row 1: Title + Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                物件名稱
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                地址
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Row 2: Status + Price/Rent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                狀態
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s] || s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {property.type === 'sale' ? (
                <>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    售價 (NT$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                  />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    月租金 (NT$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                  />
                </>
              )}
            </div>
          </div>

          {/* Row 3: Rental-only lease term */}
          {property.type === 'rental' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  租期 (月)
                </label>
                <input
                  type="number"
                  min={1}
                  value={leaseTerm}
                  onChange={(e) => setLeaseTerm(Number(e.target.value))}
                  className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Row 4: Property type + Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                物件類型
              </label>
              <input
                type="text"
                placeholder="公寓、別墅、套房..."
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                面積 (坪)
              </label>
              <input
                type="number"
                min={0}
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">房</label>
                <input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">衛</label>
                <input
                  type="number"
                  min={0}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              描述 <span className="text-text-muted font-normal">(留空則保留原有描述)</span>
            </label>
            <textarea
              rows={3}
              placeholder="輸入物件描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted resize-y"
            />
          </div>

          {/* Info line */}
          <div className="text-xs text-text-muted">
            所有者：{property.ownerName} &middot; 建立日期：
            {new Date(property.createdAt).toLocaleDateString('zh-TW')}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-secondary border-t border-border-default px-6 py-4 flex justify-end gap-3">
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
            {isPending ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  );
}
