'use client';

import { useTransition, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ContactLeadNote } from './actions';
import { addContactLeadNote, deleteContactLeadNote } from './actions';

const NOTE_TYPE_LABELS: Record<ContactLeadNote['noteType'], string> = {
  note: '備註',
  reply: '回覆紀錄',
  internal: '內部',
};

const NOTE_TYPE_COLORS: Record<ContactLeadNote['noteType'], string> = {
  note: 'bg-blue-500/10 text-blue-400',
  reply: 'bg-green-500/10 text-green-400',
  internal: 'bg-yellow-500/10 text-yellow-400',
};

interface ContactLeadNotesSectionProps {
  leadId: string;
  initialNotes: ContactLeadNote[];
}

function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ContactLeadNotesSection({ leadId, initialNotes }: ContactLeadNotesSectionProps) {
  const [notes, setNotes] = useState<ContactLeadNote[]>(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = String(formData.get('content') ?? '').trim();
    const noteType = String(formData.get('noteType') ?? 'note') as ContactLeadNote['noteType'];
    setError(null);

    if (!content) {
      setError('備註內容不能為空');
      return;
    }

    startTransition(async () => {
      const result = await addContactLeadNote(formData);
      if ('error' in result && result.error) {
        setError(result.error);
      } else {
        // Optimistically append a placeholder — server revalidation will refresh on next nav
        const now = new Date().toISOString();
        setNotes((prev) => [
          ...prev,
          {
            id: `tmp-${now}`,
            leadId,
            authorId: '',
            authorName: '你',
            content,
            noteType,
            createdAt: now,
          },
        ]);
        formRef.current?.reset();
      }
    });
  };

  const handleDelete = (noteId: string) => {
    const formData = new FormData();
    formData.append('noteId', noteId);
    formData.append('leadId', leadId);

    startTransition(async () => {
      const result = await deleteContactLeadNote(formData);
      if (!('error' in result && result.error)) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Existing notes */}
      {notes.length === 0 ? (
        <p className="text-sm text-text-muted">目前尚無備註或回覆紀錄。</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-xl border border-border-default bg-bg-secondary p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${NOTE_TYPE_COLORS[note.noteType]}`}
                  >
                    {NOTE_TYPE_LABELS[note.noteType]}
                  </span>
                  <span className="text-xs font-medium text-text-primary">{note.authorName}</span>
                  <span className="text-xs text-text-muted">{formatNoteDate(note.createdAt)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending || note.id.startsWith('tmp-')}
                  className="shrink-0 text-text-muted transition hover:text-red-400 disabled:opacity-40"
                  aria-label="刪除備註"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                {note.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Add note form */}
      <form ref={formRef} onSubmit={handleAdd} className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-4">
        <input type="hidden" name="leadId" value={leadId} />

        <div className="flex flex-wrap gap-3">
          <label className="block flex-1 min-w-[120px]">
            <span className="mb-1 block text-xs font-medium text-text-secondary">類型</span>
            <select
              name="noteType"
              defaultValue="note"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="note">備註</option>
              <option value="reply">回覆紀錄</option>
              <option value="internal">內部</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-secondary">內容</span>
          <textarea
            name="content"
            rows={3}
            placeholder="新增備註或回覆紀錄…"
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? '儲存中…' : '新增備註'}
        </button>
      </form>
    </div>
  );
}
