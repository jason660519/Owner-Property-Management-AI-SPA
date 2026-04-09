'use client';

// Sheet panel for creating / editing a single prompt

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PromptTagInput } from './PromptTagInput';
import { parseImportedMd, exportPromptAsMd } from './PromptFileIO';
import type { SavedPrompt, SavePromptOpts } from './types';

interface PromptEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: SavedPrompt | null; // null = create mode
  allTags: string[];
  onSave: (name: string, content: string, opts: SavePromptOpts) => Promise<string | null>;
  onClose: () => void;
}

export function PromptEditorSheet({
  open, onOpenChange, prompt, allTags, onSave, onClose,
}: PromptEditorSheetProps) {
  const isEditing = !!prompt;

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when prompt changes or sheet opens
  useEffect(() => {
    if (open) {
      setName(prompt?.name ?? '');
      setContent(prompt?.content ?? '');
      setTags(prompt?.tags ?? []);
      setDescription(prompt?.description ?? '');
      setError('');
      setSaving(false);
      // Auto-focus name input after a tick
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open, prompt]);

  const isDirty = isEditing
    ? name !== prompt.name || content !== prompt.content ||
      JSON.stringify(tags) !== JSON.stringify(prompt.tags) ||
      description !== prompt.description
    : name.trim() !== '' || content.trim() !== '';

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    const err = await onSave(name, content, { tags, description });
    setSaving(false);
    if (err) setError(err);
  }, [name, content, tags, description, onSave]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseImportedMd(file);
      setName(parsed.name);
      setContent(parsed.content);
      if (parsed.tags.length) setTags(parsed.tags);
      if (parsed.description) setDescription(parsed.description);
    } catch {
      setError('無法解析檔案');
    }
    // Reset file input so the same file can be re-imported
    e.target.value = '';
  }, []);

  const handleExport = useCallback(() => {
    if (!name.trim() || !content.trim()) return;
    exportPromptAsMd({
      id: prompt?.id ?? '',
      name, content, tags, description,
      is_favorite: prompt?.is_favorite ?? false,
      created_at: prompt?.created_at ?? '',
      updated_at: prompt?.updated_at ?? '',
    });
  }, [name, content, tags, description, prompt]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? '編輯 Prompt' : '新增 Prompt'}</SheetTitle>
          <SheetDescription>
            {isEditing ? '修改 Prompt 內容與設定' : '建立新的 Prompt 範本'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <Input
            ref={nameInputRef}
            label="Prompt 名稱"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="例如：謄本解析-單一建號"
          />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              分類標籤
            </label>
            <PromptTagInput
              tags={tags}
              onChange={setTags}
              allTags={allTags}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              使用場景與說明
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border-default bg-bg-primary text-sm text-text-primary p-3 resize-y placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="描述此 Prompt 的用途和適用場景..."
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-text-primary">
                Prompt 內容 <span className="text-red-400">*</span>
              </label>
              <span className="text-xs text-text-muted">{content.length} 字</span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={16}
              className="w-full rounded-md border border-border-default bg-bg-primary text-sm text-text-primary p-3 font-mono resize-y placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="在此輸入 Prompt 內容..."
            />
          </div>

          {/* Import / Export buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => fileInputRef.current?.click()}
            >
              匯入 .md
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
              disabled={!name.trim() || !content.trim()}
            >
              匯出 .md
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle p-4 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || saving || !name.trim() || !content.trim()}
            isLoading={saving}
          >
            {isEditing ? '儲存變更' : '建立 Prompt'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
