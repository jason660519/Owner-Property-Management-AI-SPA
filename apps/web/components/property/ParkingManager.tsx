/**
 * @file ParkingManager.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description 車位管理組件 - 支援獨立車位與公設車位
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export interface ParkingSpace {
  id: string;
  type: 'independent' | 'shared';  // 獨立車位 | 公設車位
  category: string;  // 平面、機械、坡道平面、坡道機械
  number: string;  // 車位編號
  area_sqm: number;
  location: string;  // 位置（選填）
}

interface ParkingManagerProps {
  parkingSpaces: ParkingSpace[];
  onChange: (spaces: ParkingSpace[]) => void;
}

const PARKING_CATEGORIES = [
  { value: '平面', label: '平面車位' },
  { value: '機械', label: '機械車位' },
  { value: '坡道平面', label: '坡道平面' },
  { value: '坡道機械', label: '坡道機械' },
  { value: '其他', label: '其他' },
];

export function ParkingManager({ parkingSpaces, onChange }: ParkingManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ParkingSpace>>({
    type: 'independent',
    category: '平面',
    number: '',
    area_sqm: 0,
    location: '',
  });

  const sqmToPing = (sqm: number) => (sqm * 0.3025).toFixed(2);

  const handleAdd = () => {
    if (!formData.type || !formData.category || !formData.area_sqm) {
      return;
    }

    const newSpace: ParkingSpace = {
      id: Date.now().toString(),
      type: formData.type as 'independent' | 'shared',
      category: formData.category,
      number: formData.number || '',
      area_sqm: formData.area_sqm,
      location: formData.location || '',
    };

    onChange([...parkingSpaces, newSpace]);
    setFormData({ type: 'independent', category: '平面', number: '', area_sqm: 0, location: '' });
    setIsAdding(false);
  };

  const handleEdit = (space: ParkingSpace) => {
    setEditingId(space.id);
    setFormData(space);
  };

  const handleSaveEdit = () => {
    if (!editingId || !formData.type || !formData.category || !formData.area_sqm) {
      return;
    }

    const updatedSpaces = parkingSpaces.map((s) =>
      s.id === editingId
        ? {
            ...s,
            type: formData.type as 'independent' | 'shared',
            category: formData.category!,
            number: formData.number || '',
            area_sqm: formData.area_sqm!,
            location: formData.location || '',
          }
        : s
    );

    onChange(updatedSpaces);
    setEditingId(null);
    setFormData({ type: 'independent', category: '平面', number: '', area_sqm: 0, location: '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ type: 'independent', category: '平面', number: '', area_sqm: 0, location: '' });
  };

  const handleDelete = (id: string) => {
    onChange(parkingSpaces.filter((s) => s.id !== id));
  };

  const independentSpaces = parkingSpaces.filter((s) => s.type === 'independent');
  const sharedSpaces = parkingSpaces.filter((s) => s.type === 'shared');
  const totalArea = parkingSpaces.reduce((sum, s) => sum + s.area_sqm, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">車位資料</h3>
          <p className="text-sm text-[#999999]">獨立車位、公設車位（可新增多筆）</p>
        </div>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增車位
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-[#2A2A2A] border border-[#7C3AED] rounded-lg p-4 space-y-3">
          {/* Type Selection */}
          <div>
            <label className="block text-sm text-white mb-2">車位類型</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <input
                  type="radio"
                  value="independent"
                  checked={formData.type === 'independent'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="peer sr-only"
                />
                <div className="p-3 border border-[#333333] rounded-lg text-center cursor-pointer transition-colors peer-checked:border-[#7C3AED] peer-checked:bg-[#7C3AED]/10">
                  <span className="text-white font-medium">🅿️ 獨立車位</span>
                  <p className="text-xs text-[#999999] mt-1">有獨立產權</p>
                </div>
              </label>
              <label className="relative">
                <input
                  type="radio"
                  value="shared"
                  checked={formData.type === 'shared'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="peer sr-only"
                />
                <div className="p-3 border border-[#333333] rounded-lg text-center cursor-pointer transition-colors peer-checked:border-[#7C3AED] peer-checked:bg-[#7C3AED]/10">
                  <span className="text-white font-medium">🏢 公設車位</span>
                  <p className="text-xs text-[#999999] mt-1">包含在公設中</p>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-white mb-1">車位種類</label>
              <select
                className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {PARKING_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white mb-1">車位編號</label>
              <Input
                placeholder="A-01"
                value={formData.number || ''}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">面積 (m²)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="12.50"
                value={formData.area_sqm || ''}
                onChange={(e) =>
                  setFormData({ ...formData, area_sqm: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">位置</label>
              <Input
                placeholder="B1F"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" onClick={handleAdd}>
              <Check className="w-4 h-4 mr-1" />
              確認新增
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setFormData({ type: 'independent', category: '平面', number: '', area_sqm: 0, location: '' });
              }}
            >
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Parking Spaces List */}
      {parkingSpaces.length > 0 ? (
        <div className="space-y-4">
          {/* Independent Spaces */}
          {independentSpaces.length > 0 && (
            <div>
              <h4 className="text-sm text-[#999999] mb-2">獨立車位 ({independentSpaces.length})</h4>
              <div className="space-y-2">
                {independentSpaces.map((space) => (
                  <ParkingSpaceItem
                    key={space.id}
                    space={space}
                    isEditing={editingId === space.id}
                    formData={formData}
                    onEdit={handleEdit}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    onDelete={handleDelete}
                    onFormChange={setFormData}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Shared Spaces */}
          {sharedSpaces.length > 0 && (
            <div>
              <h4 className="text-sm text-[#999999] mb-2">公設車位 ({sharedSpaces.length})</h4>
              <div className="space-y-2">
                {sharedSpaces.map((space) => (
                  <ParkingSpaceItem
                    key={space.id}
                    space={space}
                    isEditing={editingId === space.id}
                    formData={formData}
                    onEdit={handleEdit}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    onDelete={handleDelete}
                    onFormChange={setFormData}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">
                車位總計 ({independentSpaces.length} 獨立 + {sharedSpaces.length} 公設)
              </span>
              <div className="text-right">
                <span className="text-lg font-bold text-[#7C3AED]">
                  {sqmToPing(totalArea)} 坪
                </span>
                <span className="text-sm text-[#999999] ml-2">({totalArea.toFixed(2)} m²)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[#666666] text-sm">
          尚未新增車位（如有車位，請點擊「新增車位」按鈕）
        </div>
      )}
    </div>
  );
}

// Parking Space Item Component
function ParkingSpaceItem({
  space,
  isEditing,
  formData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onFormChange,
}: {
  space: ParkingSpace;
  isEditing: boolean;
  formData: Partial<ParkingSpace>;
  onEdit: (space: ParkingSpace) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onFormChange: (data: Partial<ParkingSpace>) => void;
}) {
  const sqmToPing = (sqm: number) => (sqm * 0.3025).toFixed(2);

  if (isEditing) {
    return (
      <div className="bg-[#2A2A2A] border border-[#7C3AED] rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <select
            className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-white text-sm"
            value={formData.category}
            onChange={(e) => onFormChange({ ...formData, category: e.target.value })}
          >
            {PARKING_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="編號"
            value={formData.number || ''}
            onChange={(e) => onFormChange({ ...formData, number: e.target.value })}
          />
          <Input
            type="number"
            step="0.01"
            value={formData.area_sqm || ''}
            onChange={(e) =>
              onFormChange({ ...formData, area_sqm: parseFloat(e.target.value) || 0 })
            }
          />
          <Input
            placeholder="位置"
            value={formData.location || ''}
            onChange={(e) => onFormChange({ ...formData, location: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="primary" size="sm" onClick={onSave}>
            <Check className="w-4 h-4 mr-1" />
            儲存
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" />
            取消
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{space.category}</span>
            {space.number && (
              <span className="text-xs bg-[#7C3AED]/20 text-[#7C3AED] px-2 py-0.5 rounded">
                {space.number}
              </span>
            )}
            {space.location && (
              <span className="text-xs text-[#999999]">({space.location})</span>
            )}
          </div>
          <div className="text-sm text-[#999999] mt-1">
            {space.area_sqm.toFixed(2)} m² ≈{' '}
            <span className="text-[#7C3AED]">{sqmToPing(space.area_sqm)} 坪</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(space)}
            className="p-2 text-[#999999] hover:text-[#7C3AED] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(space.id)}
            className="p-2 text-[#999999] hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
