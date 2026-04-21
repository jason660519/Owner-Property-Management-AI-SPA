# BottomSheetTabs — Excel-Style Bottom Tab Navigation

Source: `apps/superadmin/components/ui/BottomSheetTabs.tsx`

## Import

```tsx
import { BottomSheetTabs, type SheetTabDef } from '@/components/ui/BottomSheetTabs';
```

## SheetTabDef Interface

```tsx
interface SheetTabDef {
  id: string;              // Tab identifier (also used as URL hash)
  label: string;           // English label
  zhLabel?: string;        // Chinese label (displayed before English)
  icon?: React.ElementType;  // lucide-react icon component
  color?: string;          // Inactive icon color class (e.g. 'text-emerald-600')
  activeColor?: string;    // Active tab classes (e.g. 'bg-emerald-600 text-white')
  badge?: number;          // Badge count (hidden if 0 or undefined)
}
```

## Basic Setup

### 1. Define Tabs

```tsx
import { Code2, FlaskConical, Rocket, Activity } from 'lucide-react';

const TABS: SheetTabDef[] = [
  {
    id: 'development',
    label: 'Development',
    zhLabel: '開發',
    icon: Code2,
    color: 'text-emerald-600',
    activeColor: 'bg-emerald-600 text-white',
    badge: 42,
  },
  {
    id: 'testing',
    label: 'Testing',
    zhLabel: '測試',
    icon: FlaskConical,
    color: 'text-blue-600',
    activeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'deployment',
    label: 'Deployment',
    zhLabel: '部署',
    icon: Rocket,
    color: 'text-purple-600',
    activeColor: 'bg-purple-600 text-white',
  },
  {
    id: 'operations',
    label: 'Operations',
    zhLabel: '運維',
    icon: Activity,
    color: 'text-orange-600',
    activeColor: 'bg-orange-600 text-white',
  },
];
```

### 2. Page Component Structure

```tsx
'use client';

import { useState, useEffect } from 'react';
import { BottomSheetTabs } from '@/components/ui/BottomSheetTabs';

export default function MyPage() {
  const [activeTab, setActiveTab] = useState('development');

  // Optional: sync with URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (TABS.some(t => t.id === hash)) setActiveTab(hash);
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Content area — fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'development' && <DevelopmentTable />}
        {activeTab === 'testing'     && <TestingTable />}
        {activeTab === 'deployment'  && <DeploymentTable />}
        {activeTab === 'operations'  && <OperationsTable />}
      </div>

      {/* Bottom tabs — fixed at bottom */}
      <BottomSheetTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
```

## Critical Layout Rules

1. **Outer container** must have `flex-1 min-h-0 flex flex-col`
2. **Content area** must have `flex-1 min-h-0 flex flex-col` — this makes it fill remaining space
3. **BottomSheetTabs** renders as `flex-none` — it stays at the bottom
4. Each tab content should be a self-contained component (its own EnhancedTable with independent `tableId`)
5. **Horizontal scroll for wide tables** — use `EnhancedTable`’s `persistentHorizontalScrollbar` if needed; the synced strip lives **inside the table card**, not fixed over the tab bar. See `troubleshooting.md` #11.

## Dense Mode Spacing Preset (for data-heavy tabs)

When a tab is primarily a worktable and users need more visible rows, use this compact spacing preset first (before touching table internals):

- **Page content shell**: `px-2 py-2 sm:px-3 lg:px-4 lg:py-3`
- **Table card**: `p-3 sm:p-4`
- **Inter-section spacing**: prefer `gap-3` (or keep `gap-4` if readability drops)
- **Optional microcopy**: allow empty tab description so subtitle line is not rendered on dense tabs

Example shell:

```tsx
<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden px-2 py-2 sm:px-3 lg:px-4 lg:py-3">
  <div className="flex min-w-0 flex-col rounded-base border border-border-default bg-bg-secondary p-3 shadow-sm sm:p-4">
    {/* table / tab content */}
  </div>
</div>
```

Use this preset for operations pages where row density is the priority; keep roomier spacing for onboarding/config pages.

## Hash Navigation

BottomSheetTabs automatically updates `window.location.hash` on tab click. To read the hash on page load:

```tsx
useEffect(() => {
  const hash = window.location.hash.slice(1);
  if (TABS.some(t => t.id === hash)) setActiveTab(hash);
}, []);
```

Users can then link directly to a tab:
```
/superadmin/dashboard/my-page#testing
```

## Per-Tab Independent State

Each tab should have its own `tableId` for EnhancedTable, so preferences (widths, alignments, freezes) are saved independently:

```tsx
{activeTab === 'testing' && (
  <EnhancedTable tableId="my_page_testing" columns={testingColumns} ... />
)}
{activeTab === 'deployment' && (
  <EnhancedTable tableId="my_page_deployment" columns={deployColumns} ... />
)}
```

## Existing Implementations

| Page | Tabs | File |
|:---|:---|:---|
| Project Progress | 4 (Dev/Test/Deploy/Ops) | `project-progress/components/SheetTabs.tsx` — custom version |
| IAM Management | 4 (Overview/Users/Roles/Groups) | `iam-management/page.tsx` — uses BottomSheetTabs directly |
| LLM Monitor | 3 (Usage Logs/Token Cost/Settings) | `llm-monitor/LLMMonitorClient.tsx` |
