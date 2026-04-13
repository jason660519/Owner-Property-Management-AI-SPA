'use client';

import { useState, useEffect } from 'react';
import { GitBranch, ClipboardCheck, Users, Rocket } from 'lucide-react';
import { BottomSheetTabs, type SheetTabDef } from '@/components/ui/BottomSheetTabs';
import PaperclipWorktreesClient from './PaperclipWorktreesClient';
import WorkSummaryTab from './WorkSummaryTab';
import AgentsTab from './AgentsTab';
import AutoDispatchTab from './AutoDispatchTab';

const TAB_DEFS: SheetTabDef[] = [
  { id: 'worktrees', label: 'Worktrees', zhLabel: 'Worktrees', icon: GitBranch, color: 'text-purple-500', activeColor: 'bg-purple-600 text-white' },
  { id: 'work-summary', label: 'Summary', zhLabel: 'Work Summary', icon: ClipboardCheck, color: 'text-emerald-500', activeColor: 'bg-emerald-600 text-white' },
  { id: 'agents', label: 'Agents', zhLabel: 'Agents', icon: Users, color: 'text-sky-500', activeColor: 'bg-sky-600 text-white' },
  { id: 'dispatch', label: 'Dispatch', zhLabel: 'Auto Dispatch', icon: Rocket, color: 'text-amber-500', activeColor: 'bg-amber-600 text-white' },
];

export default function PaperclipDashboardTabs() {
  const [activeTab, setActiveTab] = useState('worktrees');
  const [badges, setBadges] = useState<Record<string, number>>({});

  // Read initial tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (TAB_DEFS.some(t => t.id === hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Merge badge counts from child tabs
  const updateBadge = (tabId: string, count: number) => {
    setBadges(prev => prev[tabId] === count ? prev : { ...prev, [tabId]: count });
  };

  const tabsWithBadges = TAB_DEFS.map(t => ({
    ...t,
    badge: badges[t.id] ?? 0,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'worktrees' && <PaperclipWorktreesClient />}
        {activeTab === 'work-summary' && <WorkSummaryTab onBadgeChange={(n) => updateBadge('work-summary', n)} />}
        {activeTab === 'agents' && <AgentsTab onBadgeChange={(n) => updateBadge('agents', n)} />}
        {activeTab === 'dispatch' && <AutoDispatchTab onBadgeChange={(n) => updateBadge('dispatch', n)} />}
      </div>
      <BottomSheetTabs tabs={tabsWithBadges} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
