/**
 * @file VLMApiKeyDrawer.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-04
 * @modifiedBy Claude Sonnet 4.5
 */

// filepath: apps/web/components/vlm/VLMApiKeyDrawer.tsx
// description: Drawer component for configuring VLM API keys

'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Key, Shield, ExternalLink } from 'lucide-react';
import { useVLMKeyManager, VLMProvider } from '@/hooks/useVLMKeyManager';

interface VLMApiKeyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROVIDER_INFO: Record<VLMProvider, { name: string; docUrl: string; placeholder: string }> = {
  anthropic_claude: {
    name: 'Anthropic Claude',
    docUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-api03-...',
  },
  openai_gpt4v: {
    name: 'OpenAI GPT-4V',
    docUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
  },
  google_gemini: {
    name: 'Google Gemini',
    docUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
    placeholder: 'AIza...',
  },
};

/**
 * Drawer component for setting up VLM API keys
 *
 * Allows users to:
 * - Select VLM provider (Anthropic, OpenAI, Google)
 * - Enter and securely save API key
 * - View provider documentation links
 */
export function VLMApiKeyDrawer({ isOpen, onClose, onSuccess }: VLMApiKeyDrawerProps) {
  const [selectedProvider, setSelectedProvider] = useState<VLMProvider>('anthropic_claude');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const { saveKey, isLoading, error } = useVLMKeyManager();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      return;
    }

    try {
      await saveKey({
        provider: selectedProvider,
        api_key: apiKey.trim(),
      });

      // Success
      setApiKey('');
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to save API key:', err);
    }
  };

  const providerInfo = PROVIDER_INFO[selectedProvider];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            設定 VLM API Key
          </SheetTitle>
          <SheetDescription>
            設定您的 VLM API Key 以啟用智能文件掃描功能。您的 API Key 將被加密儲存。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>安全提示：</strong>您的 API Key 將使用 AES-GCM 加密後儲存在資料庫中，僅您本人可存取。
            </AlertDescription>
          </Alert>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">選擇 VLM 提供商</Label>
            <Select
              value={selectedProvider}
              onValueChange={(value) => setSelectedProvider(value as VLMProvider)}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic_claude">Anthropic Claude (推薦)</SelectItem>
                <SelectItem value="openai_gpt4v">OpenAI GPT-4V</SelectItem>
                <SelectItem value="google_gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiKey">API Key</Label>
              <a
                href={providerInfo.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                取得 API Key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              placeholder={providerInfo.placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              {showKey ? '隱藏' : '顯示'} API Key
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <div className="text-xs text-gray-600 space-y-1">
            <p>• 您的 API Key 僅用於處理您上傳的文件</p>
            <p>• 系統不會儲存明文 API Key</p>
            <p>• 您可以隨時修改或刪除 API Key</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              取消
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={!apiKey.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存設定'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
