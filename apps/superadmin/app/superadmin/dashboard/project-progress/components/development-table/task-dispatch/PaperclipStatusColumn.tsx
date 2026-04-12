'use client';

// Table column cell showing inline Paperclip issue status.
// Thin wrapper around TaskStatusChip that fits the column renderer pattern.

import type { PaperclipTaskRow } from '@/app/api/paperclip/task-queue/route';
import { usePaperclipTaskStatus } from '@/lib/hooks/usePaperclipTaskStatus';
import TaskStatusChip from './TaskStatusChip';

interface PaperclipStatusColumnProps {
  task: PaperclipTaskRow | undefined;
  userId: string;
  onClickDetail?: () => void;
}

export default function PaperclipStatusColumn({
  task, userId, onClickDetail,
}: PaperclipStatusColumnProps) {
  const issueId = task?.issue_id ?? null;
  const taskStatus = usePaperclipTaskStatus(issueId, userId);

  if (!task) {
    return <span className="text-[10px] text-text-muted">—</span>;
  }

  // If polling hasn't started yet, show the DB status as fallback
  if (!taskStatus.liveStatus && !taskStatus.pollStopped) {
    const statusLabel = task.status === 'submitted' ? 'Queued' : task.status;
    return (
      <span className="text-[10px] text-text-muted font-mono">{statusLabel}</span>
    );
  }

  return <TaskStatusChip taskStatus={taskStatus} onClick={onClickDetail} />;
}
