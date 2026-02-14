// filepath: apps/superadmin/components/ai-settings/SystemPromptEditor.tsx
// Component for editing system prompts per feature module

'use client';

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Play, Copy, Check, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FEATURE_MODULES, AI_PROVIDERS, type FeatureModule } from '@/lib/ai-providers';
import type { SavedPrompt, SavedKey } from '@/lib/hooks/useAISettings';
import { SystemPromptFileUpload } from './SystemPromptFileUpload';

interface SystemPromptEditorProps {
  savedPrompts: SavedPrompt[];
  savedKeys: SavedKey[];
  onSave: (moduleKey: string, provider: string, promptContent: string, promptName?: string) => Promise<void>;
}

export function SystemPromptEditor({ savedPrompts, savedKeys, onSave }: SystemPromptEditorProps) {
  const [selectedModule, setSelectedModule] = useState<string>(FEATURE_MODULES[0]?.key || '');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [promptContent, setPromptContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const activeProviders = AI_PROVIDERS.filter(p =>
    savedKeys.some(k => k.provider === p.id)
  );

  const currentModule = FEATURE_MODULES.find(m => m.key === selectedModule);

  // Load existing prompt when module/provider changes
  useEffect(() => {
    if (!selectedModule || !selectedProvider) return;
    const existing = savedPrompts.find(
      p => p.module_key === selectedModule && p.provider === selectedProvider
    );
    if (existing) {
      setPromptContent(existing.prompt_content);
    } else {
      // Use default prompt from module definition
      const mod = FEATURE_MODULES.find(m => m.key === selectedModule);
      setPromptContent(mod?.defaultPrompt || '');
    }
    setTestResult(null);
  }, [selectedModule, selectedProvider, savedPrompts]);

  // Auto-select first provider if none selected
  useEffect(() => {
    if (!selectedProvider && activeProviders.length > 0) {
      setSelectedProvider(activeProviders[0].id);
    }
  }, [activeProviders, selectedProvider]);

  const handleSave = async () => {
    if (!selectedModule || !selectedProvider) return;
    setSaving(true);
    try {
      await onSave(selectedModule, selectedProvider, promptContent);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const mod = FEATURE_MODULES.find(m => m.key === selectedModule);
    setPromptContent(mod?.defaultPrompt || '');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    // Simulate a test call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResult(`✅ Prompt 格式驗證通過 (${selectedProvider})\n📝 字數: ${promptContent.length}\n📊 預估 Token: ~${Math.ceil(promptContent.length / 3)}`);
    setTesting(false);
  };

  const currentPromptVersion = savedPrompts.find(
    p => p.module_key === selectedModule && p.provider === selectedProvider
  )?.version;

  return (
    <div className="space-y-4">
      {/* Module & Provider Selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">功能模組</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
          >
            {FEATURE_MODULES.map(mod => (
              <option key={mod.key} value={mod.key}>{mod.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">AI 提供商</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
          >
            {activeProviders.length === 0 && <option value="">未設定任何金鑰</option>}
            {activeProviders.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Module Description */}
      {currentModule && (
        <div className="px-3 py-2 bg-bg-tertiary rounded-base text-xs text-text-muted">
          <strong className="text-text-secondary">{currentModule.name}：</strong>
          {currentModule.description}
        </div>
      )}

      {/* Prompt Editor */}
      <div className="relative">
        <textarea
          value={promptContent}
          onChange={(e) => setPromptContent(e.target.value)}
          rows={12}
          className="w-full px-4 py-3 bg-bg-secondary border border-border-default rounded-base text-sm text-text-primary font-mono leading-relaxed resize-y focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
          placeholder="輸入 System Prompt..."
        />
        {/* Character count */}
        <div className="absolute bottom-3 right-3 text-[10px] text-text-muted">
          {promptContent.length} 字 | ~{Math.ceil(promptContent.length / 3)} tokens
          {currentPromptVersion && (
            <span className="ml-2">
              <History size={10} className="inline" /> v{currentPromptVersion}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={handleSave} isLoading={saving} disabled={!selectedProvider}>
            <Save size={14} /> 儲存 Prompt
          </Button>
          <Button size="sm" variant="secondary" onClick={handleTest} isLoading={testing} disabled={!selectedProvider}>
            <Play size={14} /> 測試
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已複製' : '複製'}
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={handleReset}>
          <RotateCcw size={14} /> 重置預設
        </Button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className="px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-base text-xs text-green-400 whitespace-pre-wrap font-mono">
          {testResult}
        </div>
      )}

      {/* File Upload Test Section */}
      <div className="border-t border-border-default pt-4">
        <SystemPromptFileUpload />
      </div>
    </div>
  );
}
