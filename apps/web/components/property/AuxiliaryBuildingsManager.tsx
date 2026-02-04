/**
 * @file AuxiliaryBuildingsManager.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description 附屬建物管理組件 - 支援多筆新增/編輯/刪除
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export interface AuxiliaryBuilding {
  id: string;
  name: string;  // 陽台、雨遮、平台等
  area_sqm: number;
  location: string;  // 位置（選填）
}

interface AuxiliaryBuildingsManagerProps {
  buildings: AuxiliaryBuilding[];
  onChange: (buildings: AuxiliaryBuilding[]) => void;
}

const COMMON_TYPES = [
  { value: '陽台', label: '陽台' },
  { value: '雨遮', label: '雨遮' },
  { value: '平台', label: '平台' },
  { value: '屋頂突出物', label: '屋頂突出物' },
  { value: '其他', label: '其他' },
];

export function AuxiliaryBuildingsManager({
  buildings,
  onChange,
}: AuxiliaryBuildingsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AuxiliaryBuilding>>({
    name: '陽台',
    area_sqm: 0,
    location: '',
  });

  const sqmToPing = (sqm: number) => (sqm * 0.3025).toFixed(2);

  const handleAdd = () => {
    if (!formData.name || !formData.area_sqm) {
      return;
    }

    const newBuilding: AuxiliaryBuilding = {
      id: Date.now().toString(),
      name: formData.name,
      area_sqm: formData.area_sqm,
      location: formData.location || '',
    };

    onChange([...buildings, newBuilding]);
    setFormData({ name: '陽台', area_sqm: 0, location: '' });
    setIsAdding(false);
  };

  const handleEdit = (building: AuxiliaryBuilding) => {
    setEditingId(building.id);
    setFormData(building);
  };

  const handleSaveEdit = () => {
    if (!editingId || !formData.name || !formData.area_sqm) {
      return;
    }

    const updatedBuildings = buildings.map((b) =>
      b.id === editingId
        ? { ...b, name: formData.name!, area_sqm: formData.area_sqm!, location: formData.location || '' }
        : b
    );

    onChange(updatedBuildings);
    setEditingId(null);
    setFormData({ name: '陽台', area_sqm: 0, location: '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '陽台', area_sqm: 0, location: '' });
  };

  const handleDelete = (id: string) => {
    onChange(buildings.filter((b) => b.id !== id));
  };

  const totalArea = buildings.reduce((sum, b) => sum + b.area_sqm, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">附屬建物</h3>
          <p className="text-sm text-[#999999]">陽台、雨遮、平台等（可新增多筆）</p>
        </div>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-[#2A2A2A] border border-[#7C3AED] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-white mb-1">類型</label>
              <select
                className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              >
                {COMMON_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white mb-1">面積 (m²)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.area_sqm || ''}
                onChange={(e) =>
                  setFormData({ ...formData, area_sqm: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">位置（選填）</label>
              <Input
                placeholder="例：前陽台"
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
                setFormData({ name: '陽台', area_sqm: 0, location: '' });
              }}
            >
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Buildings List */}
      {buildings.length > 0 ? (
        <div className="space-y-2">
          {buildings.map((building) => (
            <div
              key={building.id}
              className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-3"
            >
              {editingId === building.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <select
                        className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#333333] rounded-lg text-white text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      >
                        {COMMON_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.area_sqm || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, area_sqm: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="位置"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="primary" size="sm" onClick={handleSaveEdit}>
                      <Check className="w-4 h-4 mr-1" />
                      儲存
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-1" />
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{building.name}</span>
                      {building.location && (
                        <span className="text-xs text-[#999999]">({building.location})</span>
                      )}
                    </div>
                    <div className="text-sm text-[#999999] mt-1">
                      {building.area_sqm.toFixed(2)} m² ≈{' '}
                      <span className="text-[#7C3AED]">{sqmToPing(building.area_sqm)} 坪</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(building)}
                      className="p-2 text-[#999999] hover:text-[#7C3AED] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(building.id)}
                      className="p-2 text-[#999999] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Total */}
          <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">附屬建物總計</span>
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
          尚未新增附屬建物（如有陽台、雨遮等，請點擊「新增」按鈕）
        </div>
      )}
    </div>
  );
}
