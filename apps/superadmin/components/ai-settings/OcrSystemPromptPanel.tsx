// filepath: apps/superadmin/components/ai-settings/OcrSystemPromptPanel.tsx
// Prompt editors for online_ocr_parse (parser) and online_ocr_judge (judge),
// persisted to ai_system_prompts table via savePrompt().

'use client';

import React, { useState, useMemo } from 'react';
import { Save, RotateCcw, ChevronDown, ChevronUp, Check, Info } from 'lucide-react';
import { TRANSCRIPT_PARSE_PROMPT, TRANSCRIPT_JUDGE_PROMPT } from '@/lib/transcript-prompts';
import {
  DETECT_BUILDING_COUNT_PROMPT,
  DETECT_BUILDING_COUNT_PROMPT_MODULE_KEY,
} from '@/lib/transcript-detect-prompts';
import type { SavedPrompt } from '@/lib/hooks/useAISettings';

// provider value used when saving – OCR prompts are model-agnostic
const OCR_PROMPT_PROVIDER = 'global';

interface PanelConfig {
  moduleKey: 'online_ocr_parse' | 'online_ocr_judge' | typeof DETECT_BUILDING_COUNT_PROMPT_MODULE_KEY;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  defaultPrompt: string;
}

const PANELS: PanelConfig[] = [
  {
    moduleKey: 'online_ocr_parse',
    title: '解析 AI Prompt',
    badge: '解析組',
    badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    description: '所有解析模型共用同一份 Prompt。儲存後下次雲端解析即套用，不影響此次暫時性修改。',
    defaultPrompt: TRANSCRIPT_PARSE_PROMPT,
  },
  {
    moduleKey: DETECT_BUILDING_COUNT_PROMPT_MODULE_KEY,
    title: '建號筆數偵測 Prompt',
    badge: '建號偵測',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    description: '「AI 偵測建號數」功能使用。可依團隊判讀規則自行調整，不影響謄本全文解析 Prompt。',
    defaultPrompt: DETECT_BUILDING_COUNT_PROMPT,
  },
  {
    moduleKey: 'online_ocr_judge',
    title: '裁判 AI Prompt',
    badge: '審核組',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    description: '當解析組模型有衝突時，裁判模型依此 Prompt 判定正確值。',
    defaultPrompt: TRANSCRIPT_JUDGE_PROMPT,
  },
];

interface OcrSystemPromptPanelProps {
  savedPrompts: SavedPrompt[];
  onSave: (moduleKey: string, provider: string, promptContent: string, promptName?: string) => Promise<void>;
}

export function OcrSystemPromptPanel({ savedPrompts, onSave }: OcrSystemPromptPanelProps) {
  return (
    <div className="space-y-3">
      {PANELS.map((panel) => (
        <PromptEditor
          key={panel.moduleKey}
          panel={panel}
          savedPrompts={savedPrompts}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single collapsible prompt editor
// ---------------------------------------------------------------------------

interface PromptEditorProps {
  panel: PanelConfig;
  savedPrompts: SavedPrompt[];
  onSave: (moduleKey: string, provider: string, promptContent: string, promptName?: string) => Promise<void>;
}

function PromptEditor({ panel, savedPrompts, onSave }: PromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Find the latest saved version for this module
  const dbPrompt = useMemo(() => {
    return savedPrompts
      .filter((p) => p.module_key === panel.moduleKey)
      .sort((a, b) => b.version - a.version)[0] ?? null;
  }, [savedPrompts, panel.moduleKey]);

  const [content, setContent] = useState<string>(() => dbPrompt?.prompt_content ?? panel.defaultPrompt);

  // Sync when DB prompt changes (e.g. after save refreshes)
  const dbContent = dbPrompt?.prompt_content ?? panel.defaultPrompt;
  const isModified = content.trim() !== dbContent.trim();
  const isUsingDefault = !dbPrompt;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(panel.moduleKey, OCR_PROMPT_PROVIDER, content.trim(), 'default');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContent(panel.defaultPrompt);
  };

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${panel.badgeClass}`}>
            {panel.badge}
          </span>
          <span className="text-sm font-medium text-text-primary">{panel.title}</span>
          {isUsingDefault ? (
            <span className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default">
              使用預設
            </span>
          ) : (
            <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
              v{dbPrompt.version} 已儲存
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={14} className="text-text-muted shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-text-muted shrink-0" />
        )}
      </button>

      {/* Expanded editor */}
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-bg-primary">
          {/* Description */}
          <div className="flex items-start gap-1.5 text-[11px] text-text-muted">
            <Info size={11} className="shrink-0 mt-0.5" />
            <span>{panel.description}</span>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="w-full px-3 py-2.5 bg-bg-secondary border border-border-default rounded-md text-xs text-text-primary font-mono leading-relaxed resize-y focus:outline-none focus:border-accent transition-colors"
              placeholder="輸入 Prompt..."
            />
            <div className="absolute bottom-2.5 right-3 text-[10px] text-text-muted pointer-events-none">
              {content.length} 字 · ~{Math.ceil(content.length / 3)} tokens
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isModified}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                ) : saved ? (
                  <Check size={12} />
                ) : (
                  <Save size={12} />
                )}
                {saved ? '已儲存' : '儲存至資料庫'}
              </button>
              {isModified && (
                <span className="text-[10px] text-amber-500">● 有未儲存的變更</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors rounded-md hover:bg-bg-secondary"
            >
              <RotateCcw size={11} />
              重置為預設
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
