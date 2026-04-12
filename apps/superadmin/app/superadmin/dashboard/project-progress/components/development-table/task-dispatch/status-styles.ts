// Badge style constants for Paperclip issue statuses.
// Shared by TaskStatusChip and TaskDetailPanel.

import type { PaperclipIssueStatus } from '@/lib/paperclip/types';

export interface StatusBadgeStyle {
  label: string;
  className: string;
}

export const STATUS_BADGE_STYLE: Record<PaperclipIssueStatus, StatusBadgeStyle> = {
  backlog:     { label: 'Backlog',     className: 'bg-bg-secondary text-text-muted border-border-default' },
  todo:        { label: 'Queued',      className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/40' },
  in_progress: { label: 'In Progress', className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/40' },
  in_review:   { label: 'In Review',   className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/40' },
  done:        { label: 'Done',        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' },
  blocked:     { label: 'Blocked',     className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/40' },
};
