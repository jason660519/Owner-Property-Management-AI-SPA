'use client';

import { useTransition, useState } from 'react';
import type { SuperadminUser } from './actions';
import { assignContactLead } from './actions';

interface ContactLeadAssigneeFormProps {
  leadId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  users: SuperadminUser[];
}

export function ContactLeadAssigneeForm({
  leadId,
  currentAssigneeId,
  currentAssigneeName,
  users,
}: ContactLeadAssigneeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentAssigneeId ?? '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedUser = users.find((u) => u.id === selectedId);
  const hasChanged = selectedId !== (currentAssigneeId ?? '');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await assignContactLead(formData);
      if ('error' in result && result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: '負責人已更新' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="assigneeId" value={selectedId} />
      <input type="hidden" name="assigneeName" value={selectedUser?.fullName ?? selectedUser?.email ?? ''} />

      {currentAssigneeName ? (
        <p className="text-sm text-text-primary">
          <span className="text-text-secondary">目前負責人：</span>
          {currentAssigneeName}
        </p>
      ) : (
        <p className="text-sm text-text-muted">尚未指派負責人</p>
      )}

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
      >
        <option value="">— 不指派 —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.fullName ?? u.email}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending || !hasChanged}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? '儲存中…' : '儲存指派'}
      </button>

      {message && (
        <p className={`text-xs ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
