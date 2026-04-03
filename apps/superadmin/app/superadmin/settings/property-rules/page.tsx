// filepath: apps/superadmin/app/superadmin/settings/property-rules/page.tsx
// created: 2026-03-18 | creator: Claude Sonnet 4.6
// Property upload rules settings — reads/writes system_settings table.
'use client';

import { useState, useEffect, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Loader2, Save, Images, X } from 'lucide-react';
import { getSystemSetting, updateSystemSetting } from '../actions';

export default function PropertyRulesPage() {
  const [maxPhotos, setMaxPhotos] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    getSystemSetting('max_photos_per_property').then(({ value }) => {
      if (typeof value === 'number') setMaxPhotos(value);
      setIsLoading(false);
    });
  }, []);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    // 移除自動消失邏輯，需手動關閉
  }

  function handleSave() {
    if (maxPhotos < 1 || maxPhotos > 200) {
      showFeedback('error', '請輸入 1–200 之間的數字');
      return;
    }
    startTransition(async () => {
      const result = await updateSystemSetting('max_photos_per_property', maxPhotos);
      if (result.error) {
        showFeedback('error', result.error);
      } else {
        showFeedback('success', '設定已儲存');
      }
    });
  }

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="物件上傳規則"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: '物件上傳規則' },
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">物件上傳規則</h1>
          <p className="text-sm text-text-muted mt-1">設定物件照片的上傳限制</p>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-md text-sm relative group ${
              feedback.type === 'success'
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            <div className="pr-6">{feedback.message}</div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
              title="關閉提示"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Images size={16} />
              照片上傳上限
            </CardTitle>
            <CardDescription>每個物件（sale 或 rental）最多可上傳的照片張數</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Loader2 size={14} className="animate-spin" /> 載入中…
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxPhotos}
                  onChange={(e) => setMaxPhotos(Number(e.target.value))}
                  className="w-24 border border-border-default rounded-md px-3 py-1.5 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                />
                <span className="text-sm text-text-muted">張（上限 200）</span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 ml-auto"
                >
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  儲存
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
