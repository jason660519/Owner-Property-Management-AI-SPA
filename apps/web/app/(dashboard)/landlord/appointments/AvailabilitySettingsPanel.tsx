'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Save, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface AvailabilitySettings {
  openTime: string;
  closeTime: string;
  intervalMinutes: 30 | 60 | 90 | 120;
  availableDays: number[];
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const INTERVALS: { value: 30 | 60 | 90 | 120; label: string }[] = [
  { value: 30, label: '30 分鐘' },
  { value: 60, label: '1 小時' },
  { value: 90, label: '1.5 小時' },
  { value: 120, label: '2 小時' },
];

export default function AvailabilitySettingsPanel() {
  const [settings, setSettings] = useState<AvailabilitySettings>({
    openTime: '09:00',
    closeTime: '18:00',
    intervalMinutes: 60,
    availableDays: [1, 2, 3, 4, 5],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/landlord/availability')
      .then((r) => r.json())
      .then((data: AvailabilitySettings) => setSettings(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const toggleDay = useCallback((day: number) => {
    setSettings((s) => ({
      ...s,
      availableDays: s.availableDays.includes(day)
        ? s.availableDays.filter((d) => d !== day)
        : [...s.availableDays, day].sort((a, b) => a - b),
    }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/landlord/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('save failed');
      showToast({ type: 'success', message: '可預約時段已儲存' });
      setIsOpen(false);
    } catch {
      showToast({ type: 'error', message: '儲存失敗，請稍後再試' });
    } finally {
      setIsSaving(false);
    }
  }, [settings, showToast]);

  return (
    <Card className="bg-[#1A1A1A] border-[#333333]">
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setIsOpen((v) => !v)}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Settings className="w-4 h-4 text-purple-400" />
          可預約時段設定
        </div>
        <span className="text-xs text-gray-500">
          {isLoading
            ? '載入中…'
            : `${settings.openTime}–${settings.closeTime}，每 ${settings.intervalMinutes} 分鐘`}
        </span>
      </div>

      {isOpen && (
        <CardContent className="border-t border-[#333333] pt-4 pb-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">開始時間</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) => setSettings((s) => ({ ...s, openTime: e.target.value }))}
                  className="flex-1 rounded border border-[#333] bg-[#262626] px-2 py-1.5 text-white text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">結束時間</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) => setSettings((s) => ({ ...s, closeTime: e.target.value }))}
                  className="flex-1 rounded border border-[#333] bg-[#262626] px-2 py-1.5 text-white text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">預約間隔</label>
              <select
                value={settings.intervalMinutes}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    intervalMinutes: Number(e.target.value) as 30 | 60 | 90 | 120,
                  }))
                }
                className="w-full rounded border border-[#333] bg-[#262626] px-2 py-1.5 text-white text-sm"
              >
                {INTERVALS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">開放日（點選切換）</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((label, day) => {
                const active = settings.availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-[#262626] border-[#333] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">日=0、一=1…六=6</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={isSaving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '儲存中…' : '儲存設定'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
