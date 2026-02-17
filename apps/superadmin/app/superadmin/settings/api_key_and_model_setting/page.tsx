'use client';

import React, { useState } from 'react';
import {
  Key, Cpu, Puzzle, MessageSquareText, BarChart3,
  ChevronRight, Loader2, RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/Button';
import {
  ApiKeyManager,
  ModelSelector,
  FeatureModuleSelector,
  SystemPromptEditor,
  UsageMonitor,
} from '@/components/ai-settings';
import { useAISettings } from '@/lib/hooks/useAISettings';

type SettingsTab = 'keys' | 'models' | 'modules' | 'prompts' | 'usage';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'keys', label: 'API 金鑰管理', icon: Key, description: '管理各 AI 服務提供商的 API 金鑰' },
  { id: 'models', label: '模型版本選擇', icon: Cpu, description: '選擇與配置可用的 AI 模型' },
  { id: 'modules', label: '功能模組配置', icon: Puzzle, description: '啟用與配置 AI 功能模組' },
  { id: 'prompts', label: 'System Prompt', icon: MessageSquareText, description: '編輯各功能模組的系統提示詞' },
  { id: 'usage', label: '使用監控與設定', icon: BarChart3, description: '查看使用統計，匯入/匯出設定' },
];

export default function AIServiceSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('keys');
  const settings = useAISettings();

  const renderContent = () => {
    if (settings.loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-accent" size={32} />
          <span className="ml-3 text-text-secondary">載入設定中...</span>
        </div>
      );
    }

    if (settings.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-red-400">
          <p className="text-sm mb-3">載入錯誤：{settings.error}</p>
          <Button size="sm" variant="secondary" onClick={settings.refresh}>
            <RefreshCw size={14} /> 重試
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'keys':
        return (
          <ApiKeyManager
            savedKeys={settings.keys}
            onSave={settings.saveKey}
            onDelete={settings.deleteKey}
            onValidate={settings.validateKey}
          />
        );
      case 'models':
        return (
          <ModelSelector
            savedKeys={settings.keys}
            savedModels={settings.models}
            onSave={settings.saveModels}
          />
        );
      case 'modules':
        return (
          <FeatureModuleSelector
            savedModules={settings.modules}
            savedKeys={settings.keys}
            savedModels={settings.models}
            onSave={settings.saveModule}
          />
        );
      case 'prompts':
        return (
          <SystemPromptEditor
            savedPrompts={settings.prompts}
            savedKeys={settings.keys}
            onSave={settings.savePrompt}
          />
        );
      case 'usage':
        return (
          <UsageMonitor
            keys={settings.keys}
            models={settings.models}
            modules={settings.modules}
            prompts={settings.prompts}
            onExport={settings.exportSettings}
            onImport={settings.importSettings}
          />
        );
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="AI 服務設定"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: 'AI 服務設定 / API KEY' },
      ]}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 lg:py-6">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              LLM API 金鑰與模型設定
            </h1>
            <p className="text-sm text-text-muted mt-1 max-w-2xl">
              管理 AI 服務提供商的金鑰、預設模型與功能模組。版面參考 OpenAI API Keys
              頁面，讓超級管理員可以快速理解目前配置狀態。
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1 text-[11px] text-text-muted w-fit">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>金鑰只會完整顯示一次，請妥善保存。</span>
          </div>
        </div>

        {/* Top Tab Navigation – mimic OpenAI segmented tabs */}
        <div className="mb-5 border-b border-border-subtle">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-text-muted'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-column layout similar to OpenAI: main content + side info */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] items-start">
          {/* Main Content */}
          <section className="space-y-4">
            {/* Tab Header inside card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {React.createElement(currentTab.icon, { size: 18, className: 'text-accent' })}
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">{currentTab.label}</h2>
                  <p className="text-[11px] text-text-muted">{currentTab.description}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={settings.refresh}>
                <RefreshCw size={14} /> 重新整理
              </Button>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-base p-4 sm:p-5 shadow-sm">
              {renderContent()}
            </div>
          </section>

          {/* Side Info / Quick Stats – inspired by OpenAI right column */}
          <aside className="space-y-4">
            {!settings.loading && (
              <div className="rounded-base border border-border-default bg-bg-secondary p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  組態概況
                </p>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-center justify-between">
                    <span>已設定金鑰</span>
                    <span className="font-medium text-text-primary">
                      {settings.keys.length}/5
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>已選模型</span>
                    <span className="font-medium text-text-primary">
                      {settings.models.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>啟用模組</span>
                    <span className="font-medium text-text-primary">
                      {settings.modules.filter(m => m.is_enabled).length}/6
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-base border border-amber-300/40 bg-amber-50/80 p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                安全提醒
              </p>
              <p className="text-xs text-amber-800">
                請勿在前端程式碼或公開版控中硬編金鑰。所有 LLM 請求應透過後端或受保護的
                Server Action 轉發。
              </p>
            </div>

            <div className="rounded-base border border-border-subtle bg-bg-secondary p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                建議流程
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-text-secondary">
                <li>先在「API 金鑰管理」中新增各雲端提供商金鑰。</li>
                <li>於「模型版本選擇」指定預設模型與備援模型。</li>
                <li>在「功能模組配置」啟用對應模組並綁定模型。</li>
                <li>最後在「System Prompt」微調各模組的系統提示詞。</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
