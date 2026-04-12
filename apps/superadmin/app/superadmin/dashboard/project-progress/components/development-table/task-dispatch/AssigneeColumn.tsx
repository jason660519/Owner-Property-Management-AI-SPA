'use client';

// Table column cell showing task assignee / claim / assign controls.

import { useState, useCallback } from 'react';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import type { PaperclipTaskRow } from '@/app/api/paperclip/task-queue/route';
import type { EngineerProfile } from '@/lib/hooks/useEngineerProfiles';

interface AssigneeColumnProps {
  rowId: string;
  task: PaperclipTaskRow | undefined;
  currentUserId: string;
  profiles: EngineerProfile[];
  profilesByUserId: Record<string, EngineerProfile>;
  onRefresh: () => void;
}

export default function AssigneeColumn({
  rowId, task, currentUserId, profiles, profilesByUserId, onRefresh,
}: AssigneeColumnProps) {
  const [claiming, setClaiming] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const res = await fetch('/api/paperclip/task-queue/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ rowId }),
      });
      if (res.ok) onRefresh();
    } catch { /* ignore */ }
    finally { setClaiming(false); }
  }, [rowId, currentUserId, onRefresh]);

  const handleAssign = useCallback(async (assigneeUserId: string) => {
    setAssigning(true);
    setShowAssignDropdown(false);
    try {
      const res = await fetch('/api/paperclip/task-queue/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ rowId, assigneeUserId }),
      });
      if (res.ok) onRefresh();
    } catch { /* ignore */ }
    finally { setAssigning(false); }
  }, [rowId, currentUserId, onRefresh]);

  // No active task — nothing to show
  if (!task) {
    return <span className="text-[10px] text-text-muted">—</span>;
  }

  // Already claimed
  if (task.claimed_by) {
    const profile = profilesByUserId[task.claimed_by];
    const displayName = profile?.display_name ?? task.claimed_by.slice(0, 8);
    const isMe = task.claimed_by === currentUserId;

    return (
      <div className="flex items-center gap-1">
        <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] text-text-primary truncate max-w-[80px]" title={displayName}>
          {isMe ? '我' : displayName}
        </span>
      </div>
    );
  }

  // Not claimed — show claim + assign buttons
  return (
    <div className="flex items-center gap-1 relative">
      <button
        type="button"
        onClick={handleClaim}
        disabled={claiming}
        className="inline-flex items-center gap-0.5 rounded border border-emerald-500/50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        title="領取此任務"
      >
        {claiming ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <UserPlus className="h-2.5 w-2.5" />}
        領取
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAssignDropdown(s => !s)}
          disabled={assigning}
          className="rounded border border-border-default px-1 py-0.5 text-[9px] text-text-muted hover:bg-bg-secondary"
          title="指派給其他工程師"
        >
          {assigning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : '指派'}
        </button>
        {showAssignDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 w-36 rounded-md border border-border-default bg-bg-primary shadow-lg">
            {profiles.length === 0 ? (
              <p className="px-2 py-1 text-[10px] text-text-muted">無可用工程師</p>
            ) : (
              profiles.map(p => (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => handleAssign(p.user_id)}
                  className="w-full px-2 py-1 text-left text-[10px] text-text-primary hover:bg-bg-secondary"
                >
                  {p.display_name}
                  {p.preferred_ide && (
                    <span className="ml-1 text-text-muted">({p.preferred_ide})</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
