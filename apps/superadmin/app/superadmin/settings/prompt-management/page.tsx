'use client';

// Page: Prompt Management (table-based UI)
// Replaces the old PromptManagerModal-based page with a full table view + Sheet editor.

import { DashboardLayout } from '@/components/dashboard';
import { PromptManagementPage } from '@/components/prompt-management/PromptManagementPage';
import { TRANSCRIPT_PARSE_SCENARIO_PRESETS } from '@/lib/transcript-parse-scenario-prompts';

export default function PromptManagementRoute() {
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
      <PromptManagementPage
        transcriptParsePresets={TRANSCRIPT_PARSE_SCENARIO_PRESETS}
      />
    </DashboardLayout>
  );
}
