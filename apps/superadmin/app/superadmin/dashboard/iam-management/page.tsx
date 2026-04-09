'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { RefreshCw, Download, Shield, Users, ShieldCheck, Lock } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { OverviewTab } from './components/OverviewTab';
import { UsersTab } from './components/UsersTab';
import { GroupsTab } from './components/GroupsTab';
import { RolesTab } from './components/RolesTab';
import { IamViewSettingsProvider } from './components/viewSettings';
import { IAMLayoutControls } from './components/LayoutControls';
import { Button } from '@/components/ui/Button';
import { BottomSheetTabs } from '@/components/ui/BottomSheetTabs';
import type { SheetTabDef } from '@/components/ui/BottomSheetTabs';

type IAMTab = 'overview' | 'users' | 'roles' | 'groups';

const TAB_IDS: IAMTab[] = ['overview', 'users', 'roles', 'groups'];

const SHEET_TABS: SheetTabDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    zhLabel: '總覽',
    icon: Shield,
    color: 'text-purple-500',
    activeColor: 'bg-purple-600 text-white',
  },
  {
    id: 'users',
    label: 'Users',
    zhLabel: '使用者',
    icon: Users,
    color: 'text-blue-500',
    activeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'roles',
    label: 'Roles',
    zhLabel: '角色',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    activeColor: 'bg-emerald-600 text-white',
  },
  {
    id: 'groups',
    label: 'Groups',
    zhLabel: '群組',
    icon: Lock,
    color: 'text-orange-500',
    activeColor: 'bg-orange-600 text-white',
  },
];

function getTabFromHash(): IAMTab {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.slice(1).toLowerCase();
  return (TAB_IDS as string[]).includes(hash) ? (hash as IAMTab) : 'overview';
}

export default function IAMManagementPage() {
  const activeTab = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('hashchange', onStoreChange);
      return () => window.removeEventListener('hashchange', onStoreChange);
    },
    () => getTabFromHash(),
    () => 'overview' as IAMTab,
  );

  const handleTabChange = (tab: string) => {
    window.location.assign(`#${tab}`);
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
      // Silent fail
    }
  };

  // Memoize tabs to avoid unnecessary re-renders of BottomSheetTabs
  const sheetTabs = useMemo(() => SHEET_TABS, []);

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
        {/* Header → Content → BottomSheetTabs layout */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Optional header actions (flex-none = fixed height) */}
          {activeTab === 'overview' && (
            <div className="flex items-center justify-end gap-3 pb-4 flex-none">
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

          {/* Tab content (flex-1 min-h-0: fills remaining height; overflow-y-auto enables scrolling) */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'users'    && <UsersTab />}
            {activeTab === 'roles'    && <RolesTab />}
            {activeTab === 'groups'   && <GroupsTab />}
          </div>

          {/* Bottom sheet tabs (Excel-style, pinned to bottom) */}
          <BottomSheetTabs
            tabs={sheetTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      </IamViewSettingsProvider>
    </DashboardLayout>
  );
}
