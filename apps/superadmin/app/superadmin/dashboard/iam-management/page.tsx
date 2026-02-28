'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { IAMTabBar } from './components/IAMTabBar';
import { OverviewTab } from './components/OverviewTab';
import { UsersTab } from './components/UsersTab';
import { GroupsTab } from './components/GroupsTab';
import { RolesTab } from './components/RolesTab';
import { IamViewSettingsProvider } from './components/viewSettings';
import { IAMLayoutControls } from './components/LayoutControls';
import { Button } from '@/components/ui/Button';
import type { IAMTab } from './components/IAMTabBar';

const TAB_IDS: IAMTab[] = ['overview', 'users', 'roles', 'groups'];

function getTabFromHash(): IAMTab {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.slice(1).toLowerCase();
  return (TAB_IDS as string[]).includes(hash) ? (hash as IAMTab) : 'overview';
}

export default function IAMManagementPage() {
  // Initialize with 'overview' so SSR and client hydration match,
  // then read the hash after mount to avoid hydration mismatch.
  const [activeTab, setActiveTab] = useState<IAMTab>('overview');

  useEffect(() => {
    setActiveTab(getTabFromHash());
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = (tab: IAMTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  };

  const handleOverviewRefresh = () => {
    if (activeTab !== 'overview') return;
    window.location.reload();
  };

  const handleOverviewExportCsv = async () => {
    if (activeTab !== 'overview') return;
    try {
      const res = await fetch('/api/iam/audit');
      if (!res.ok) return;
      const data = await res.json();
      const logs = (data?.logs ?? []) as {
        timestamp: string;
        actor: string;
        action: string;
        targetType: string;
        target: string;
        details: string;
        status: string;
      }[];

      const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target', 'Details', 'Status'];
      const csvContent = [
        headers.join(','),
        ...logs.map(log =>
          [
            log.timestamp,
            log.actor,
            log.action,
            log.targetType,
            log.target,
            `"${log.details}"`,
            log.status,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `iam_audit_report_${new Date().toISOString()}.csv`;
      link.click();
    } catch {
      // 靜默失敗即可
    }
  };

  return (
    <DashboardLayout
      pageTitle="IAM Management"
      breadcrumbs={[
        { label: '超級管理員', href: '/superadmin' },
        { label: 'IAM Management' },
      ]}
      greeting="管理系統角色清單及各資源存取權限"
      contentFullHeight
    >
      <IamViewSettingsProvider>
        {/* flex-col + flex-1 min-h-0: fills DashboardLayout's remaining height so
            tab content (esp. RolesTab) can use overflow-y-auto flex-1 min-h-0
            for a single bounded scroll container (same pattern as project-progress) */}
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          {/* Tab bar + optional header actions (flex-none = fixed height) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-none">
            <IAMTabBar activeTab={activeTab} onTabChange={handleTabChange} />
            {activeTab === 'overview' && (
              <div className="flex items-center gap-3">
                <IAMLayoutControls />
                <Button variant="outline" onClick={handleOverviewRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
                <Button variant="outline" onClick={handleOverviewExportCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  匯出 CSV
                </Button>
              </div>
            )}
          </div>
          {/* Tab content (flex-1 min-h-0 flex flex-col: fills remaining height; flex col so children can use flex-1) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'users'    && <UsersTab />}
            {activeTab === 'roles'    && <RolesTab />}
            {activeTab === 'groups'   && <GroupsTab />}
          </div>
        </div>
      </IamViewSettingsProvider>
    </DashboardLayout>
  );
}
