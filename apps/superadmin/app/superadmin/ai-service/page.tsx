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

export default function AIServicePage() {
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
        { label: 'AI 服務設定' },
      ]}
    >
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">LLM AI 服務設定</h1>
          <p className="text-sm text-text-muted mt-1">
            管理 AI 服務提供商金鑰、模型選擇、功能模組配置與 System Prompt 設定
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <nav className="w-64 flex-shrink-0 space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-base text-left transition-all group ${
                    isActive
                      ? 'bg-accent-subtle border border-accent/30 text-accent'
                      : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{tab.label}</span>
                    <span className="text-[11px] text-text-muted block truncate">{tab.description}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-accent flex-shrink-0" />}
                </button>
              );
            })}

            {/* Quick Stats in Sidebar */}
            {!settings.loading && (
              <div className="mt-4 pt-4 border-t border-border-default space-y-2 px-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">快速概覽</p>
                <div className="text-xs text-text-secondary space-y-1">
                  <div className="flex justify-between">
                    <span>已設定金鑰</span>
                    <span className="font-medium text-text-primary">{settings.keys.length}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>已選模型</span>
                    <span className="font-medium text-text-primary">{settings.models.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>啟用模組</span>
                    <span className="font-medium text-text-primary">
                      {settings.modules.filter(m => m.is_enabled).length}/6
                    </span>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tab Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {React.createElement(currentTab.icon, { size: 20, className: 'text-accent' })}
                <h2 className="text-lg font-semibold text-text-primary">{currentTab.label}</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={settings.refresh}>
                <RefreshCw size={14} /> 重新整理
              </Button>
            </div>

            {/* Content */}
            <div className="bg-bg-secondary border border-border-default rounded-base p-5">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
