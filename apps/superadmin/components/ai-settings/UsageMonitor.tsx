// filepath: apps/superadmin/components/ai-settings/UsageMonitor.tsx
// Component for displaying AI usage statistics and export/import settings

'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { SavedKey, SavedModel, SavedModule, SavedPrompt } from '@/lib/hooks/useAISettings';

interface UsageMonitorProps {
  keys: SavedKey[];
  models: SavedModel[];
  modules: SavedModule[];
  prompts: SavedPrompt[];
  onExport: () => Promise<unknown>;
  onImport: (data: unknown) => Promise<unknown>;
}

export function UsageMonitor({ keys, models, modules, prompts, onExport, onImport }: UsageMonitorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stats = {
    activeProviders: keys.filter(k => k.is_valid).length,
    totalProviders: keys.length,
    selectedModels: models.length,
    enabledModules: modules.filter(m => m.is_enabled).length,
    totalModules: modules.length,
    activePrompts: prompts.length,
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const data = await onExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: '設定已成功匯出' });
    } catch {
      setMessage({ type: 'error', text: '匯出失敗' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await onImport(data);
      setMessage({ type: 'success', text: `匯入成功` });
    } catch {
      setMessage({ type: 'error', text: '匯入失敗：檔案格式不正確' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="已設定提供商"
          value={`${stats.activeProviders}/${stats.totalProviders}`}
          icon={<BarChart3 size={16} />}
          color="text-blue-400 bg-blue-500/10"
        />
        <StatCard
          label="已選模型"
          value={String(stats.selectedModels)}
          icon={<BarChart3 size={16} />}
          color="text-green-400 bg-green-500/10"
        />
        <StatCard
          label="啟用模組"
          value={`${stats.enabledModules}/${stats.totalModules || TOTAL_MODULES}`}
          icon={<BarChart3 size={16} />}
          color="text-purple-400 bg-purple-500/10"
        />
        <StatCard
          label="System Prompts"
          value={String(stats.activePrompts)}
          icon={<BarChart3 size={16} />}
          color="text-yellow-400 bg-yellow-500/10"
        />
      </div>

      {/* Export/Import */}
      <div className="border border-border-default rounded-base p-4">
        <h4 className="text-sm font-semibold text-text-primary mb-3">匯入 / 匯出設定</h4>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={handleExport} isLoading={exporting}>
            <Download size={14} /> 匯出設定 (JSON)
          </Button>
          <Button size="sm" variant="secondary" onClick={handleImportClick} isLoading={importing}>
            <Upload size={14} /> 匯入設定
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="mt-2 flex items-start gap-2 text-[11px] text-text-muted">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-yellow-400" />
          <span>匯入設定會覆蓋現有的模型選擇、功能模組和 System Prompt 設定。API 金鑰不會被匯入/匯出，以確保安全性。</span>
        </div>

        {message && (
          <div className={`mt-2 px-3 py-2 rounded-base text-xs ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

const TOTAL_MODULES = 6;

function StatCard({ label, value, icon, color }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="border border-border-default rounded-base p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-lg font-bold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  );
}
