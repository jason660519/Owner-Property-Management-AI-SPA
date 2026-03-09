'use client';

// Page: Prompt Management
// Renders the PromptManagerModal as an always-open overlay.
// Closing it navigates back to the Settings page.
// When opened via window.open (e.g. from TranscriptParseSection "在新分頁開啟"),
// provides onLoad so "載入此 Prompt 至目前頁面" posts to opener and fills the caller's prompt field.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import {
  PromptManagerModal,
  PROMPT_LOAD_MESSAGE_TYPE,
} from '@/components/ai-settings/PromptManagerModal';

export default function PromptManagementPage() {
  const router = useRouter();
  const [hasOpener, setHasOpener] = useState(false);

  useEffect(() => {
    setHasOpener(
      typeof window !== 'undefined' &&
        !!window.opener &&
        !(window.opener as Window).closed,
    );
  }, []);

  const handleLoadToOpener = (content: string, name: string) => {
    if (
      typeof window !== 'undefined' &&
      window.opener &&
      !(window.opener as Window).closed
    ) {
      window.opener.postMessage(
        { type: PROMPT_LOAD_MESSAGE_TYPE, content, name },
        window.location.origin,
      );
    }
  };

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="Prompt 管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: 'Prompt 管理' },
      ]}
    >
      {/* When opened from another tab (opener), 載入 sends prompt to that tab. Otherwise show hint. */}
      <PromptManagerModal
        onClose={() => router.push('/superadmin/settings')}
        onLoad={hasOpener ? handleLoadToOpener : undefined}
        noOpenerHint={
          !hasOpener
            ? '從「謄本解析」或「統一測試」頁面點擊「在新分頁開啟」後，此處會顯示「載入至目前頁面」按鈕，可將選定的 Prompt 自動填回該頁。'
            : undefined
        }
      />
    </DashboardLayout>
  );
}

