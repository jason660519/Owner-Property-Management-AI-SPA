
'use client';

import { useState, useEffect, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  History,
  ArrowRight
} from 'lucide-react';
import { syncLvrDataAction, getLvrStatsAction, LvrStatItem } from '@/lib/actions/lvr-sync';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

const TAIWAN_CITIES = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
  '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '臺東縣', '澎湖縣', '金門縣', '連江縣'
];

export default function LvrSyncPage() {
  const [selectedCity, setSelectedCity] = useState('臺北市');
  const [stats, setStats] = useState<Record<string, LvrStatItem>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoadingStats(true);
    const result = await getLvrStatsAction();
    if (result.success && result.stats) {
      setStats(result.stats);
    }
    setLoadingStats(false);
  }

  function handleSync() {
    if (!selectedCity) return;
    
    setFeedback(null);
    startTransition(async () => {
      const result = await syncLvrDataAction(selectedCity);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        await loadStats();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="實價登錄資料同步"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: '實價登錄資料同步' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <RefreshCw className={isPending ? 'animate-spin' : ''} />
            實價登錄資料同步
          </h1>
          <p className="text-sm text-text-muted mt-1">
            手動從內政部不動產成交案件實際資訊資料供應系統 (Open Data) 同步最新實價登錄資料。
          </p>
        </div>

        {feedback && (
          <div className={`p-4 rounded-lg flex items-start gap-3 border ${
            feedback.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-700' 
              : 'bg-red-500/10 border-red-500/20 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="shrink-0 mt-0.5" size={18} /> : <AlertCircle className="shrink-0 mt-0.5" size={18} />}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* 同步控制卡片 */}
          <Card variant="outlined" className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">同步控制</CardTitle>
              <CardDescription>選擇縣市並觸發增量更新。系統會自動下載最新成交資料並合併至資料庫，重複紀錄將自動排除。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="city-select" className="text-sm font-medium text-text-secondary">
                  選擇同步縣市
                </label>
                <select
                  id="city-select"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {TAIWAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-bg-tertiary rounded-lg border border-border-default space-y-3">
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Database size={16} className="text-accent" />
                  同步說明
                </h4>
                <ul className="text-xs text-text-muted space-y-2 list-disc list-inside">
                  <li>同步過程大約需要 10-30 秒，視網路狀況與縣市資料量而定。</li>
                  <li>系統將抓取內政部最新發佈的最近 4 季成交資料包。</li>
                  <li><strong>自動去重</strong>：系統會比對門牌、日期、價格與面積，僅匯入資料庫中尚未存在的紀錄。</li>
                  <li><strong>資料累積</strong>：重複執行不會刪除舊資料，可協助建立跨年度的成交資料庫。</li>
                </ul>
              </div>

              <button
                onClick={handleSync}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2.5 rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                {isPending ? '正在從內政部下載並比對中...' : `立即更新 ${selectedCity} 資料`}
              </button>
            </CardContent>
          </Card>

          {/* 目前資料統計卡片 */}
          <Card variant="outlined">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History size={18} />
                資料統計
              </CardTitle>
              <CardDescription>目前資料庫中的筆數統計</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="animate-spin text-accent" />
                  <p className="text-xs text-text-muted">載入統計資料中...</p>
                </div>
              ) : Object.keys(stats).length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">目前尚無任何成交資料</p>
              ) : (
                <div className="space-y-4">
                  {TAIWAN_CITIES.filter(c => stats[c]).map(city => (
                    <div key={city} className="p-3 rounded-lg bg-bg-secondary/50 border border-border-default space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-text-primary">{city}</span>
                        <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          {stats[city].count.toLocaleString()} 筆
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                        <History size={10} />
                        最後更新：{stats[city].lastUpdated ? new Date(stats[city].lastUpdated!).toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '未知'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <ArrowRight size={14} className="text-accent" />
          資料來源：<a href="https://lvr.land.moi.gov.tw/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">內政部不動產成交案件實際資訊資料供應系統</a>
        </div>
      </div>
    </DashboardLayout>
  );
}
