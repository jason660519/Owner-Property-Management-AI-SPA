'use client';

// Colored, per-file collapsible git-diff viewer.
// Parses the raw diff string client-side via parseDiffFiles (zero external
// deps) and renders each file as a <details> with a summary row showing the
// path, status pill, and +/− stats. Keyboard shortcuts: J/K navigate files,
// E/C expand/collapse all, ? toggles shortcut help.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, FilePlus, FileMinus, FileDiff, FileSymlink, Keyboard } from 'lucide-react';
import clsx from 'clsx';
import { parseDiffFiles, type DiffFile, type DiffLine, type DiffLineKind } from '@/lib/paperclip/diff-parser';

export interface DiffViewerProps {
  /** Raw `git diff baseBranch..branch` output. */
  diff: string;
  /** When the underlying diff was truncated, flag it in the header. */
  truncated?: boolean;
  /** Original total bytes for the truncated note. */
  diffTotalBytes?: number;
  /** If true, all files start expanded. Default false (only first 3 expanded). */
  expandAll?: boolean;
}

const STATUS_PILL: Record<DiffFile['status'], { label: string; className: string; Icon: typeof FileDiff }> = {
  added:    { label: 'added',    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40', Icon: FilePlus },
  deleted:  { label: 'deleted',  className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40', Icon: FileMinus },
  modified: { label: 'modified', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40', Icon: FileDiff },
  renamed:  { label: 'renamed',  className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40', Icon: FileSymlink },
};

const LINE_CLASS: Record<DiffLineKind, string> = {
  header:   'text-text-muted',
  meta:     'text-text-muted',
  fromFile: 'text-text-muted',
  toFile:   'text-text-muted',
  hunk:     'text-indigo-700 dark:text-indigo-400 bg-indigo-500/5',
  add:      'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
  del:      'text-red-700 dark:text-red-400 bg-red-500/10',
  context:  'text-text-secondary',
};

export default function DiffViewer({ diff, truncated, diffTotalBytes, expandAll = false }: DiffViewerProps) {
  const files = useMemo(() => parseDiffFiles(diff), [diff]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    files.forEach((f, i) => { init[f.path] = expandAll || i < 3; });
    return init;
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const fileRefs = useRef<Array<HTMLElement | null>>([]);

  const toggle = useCallback(
    (path: string) => setOpenMap((cur) => ({ ...cur, [path]: !cur[path] })),
    [],
  );
  const setAll = useCallback(
    (value: boolean) => {
      const next: Record<string, boolean> = {};
      files.forEach((f) => { next[f.path] = value; });
      setOpenMap(next);
    },
    [files],
  );

  // Scroll a given file index into view + expand it. Used by J/K.
  const focusFile = useCallback(
    (nextIndex: number) => {
      if (files.length === 0) return;
      const idx = ((nextIndex % files.length) + files.length) % files.length;
      setActiveIndex(idx);
      const path = files[idx].path;
      setOpenMap((cur) => ({ ...cur, [path]: true }));
      // Defer scrolling one frame so the expand paint lands first.
      window.requestAnimationFrame(() => {
        fileRefs.current[idx]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    },
    [files],
  );

  // Keyboard shortcuts. The parent modal unmounts the whole subtree on
  // close, so no manual cleanup required beyond the normal effect return.
  useEffect(() => {
    if (files.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      // Ignore when the user is typing in a text input / textarea / editable.
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      // Don't hijack modifier combos — those belong to the browser / OS.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'j':
        case 'J':
          e.preventDefault();
          focusFile(activeIndex + 1);
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          focusFile(activeIndex - 1);
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          setAll(true);
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          setAll(false);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((s) => !s);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [files.length, activeIndex, focusFile, setAll]);

  if (files.length === 0) {
    return (
      <div className="rounded border border-border-default bg-bg-secondary p-4 text-center text-xs text-text-muted">
        (無變動)
      </div>
    );
  }

  const totalAdd = files.reduce((n, f) => n + f.additions, 0);
  const totalDel = files.reduce((n, f) => n + f.deletions, 0);

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-[11px] text-text-secondary">
        <div>
          <span className="font-semibold text-text-primary">{files.length}</span> files
          <span className="ml-2 text-emerald-600 dark:text-emerald-400">+{totalAdd}</span>
          <span className="ml-1 text-red-600 dark:text-red-400">-{totalDel}</span>
          {truncated && (
            <span className="ml-3 text-amber-600 dark:text-amber-400">
              (truncated — total {diffTotalBytes?.toLocaleString() ?? '?'} bytes)
            </span>
          )}
          <span className="ml-3 text-text-muted">
            {activeIndex + 1}/{files.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowShortcuts((s) => !s)}
            className="inline-flex items-center gap-0.5 rounded border border-border-default px-1.5 py-0.5 text-[10px] text-text-muted hover:bg-bg-secondary hover:text-text-primary"
            title="Keyboard shortcuts (?)"
            aria-label="Toggle keyboard shortcuts help"
            aria-pressed={showShortcuts}
          >
            <Keyboard className="h-3 w-3" />
            ?
          </button>
          <button
            type="button"
            onClick={() => setAll(true)}
            className="rounded border border-border-default px-1.5 py-0.5 text-[10px] text-text-muted hover:bg-bg-secondary hover:text-text-primary"
            title="Expand all (E)"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="rounded border border-border-default px-1.5 py-0.5 text-[10px] text-text-muted hover:bg-bg-secondary hover:text-text-primary"
            title="Collapse all (C)"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts help — togglable via ? key or the button */}
      {showShortcuts && (
        <div className="rounded border border-border-default bg-bg-secondary/60 px-3 py-2 text-[10px] text-text-secondary">
          <p className="mb-1 font-semibold text-text-primary">Keyboard shortcuts</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
            <li><kbd className="rounded bg-bg-primary px-1">J</kbd> next file</li>
            <li><kbd className="rounded bg-bg-primary px-1">K</kbd> previous file</li>
            <li><kbd className="rounded bg-bg-primary px-1">E</kbd> expand all</li>
            <li><kbd className="rounded bg-bg-primary px-1">C</kbd> collapse all</li>
            <li><kbd className="rounded bg-bg-primary px-1">?</kbd> toggle this help</li>
            <li><kbd className="rounded bg-bg-primary px-1">Esc</kbd> close viewer</li>
          </ul>
        </div>
      )}

      {/* Per-file accordions */}
      {files.map((f, idx) => {
        const isOpen = openMap[f.path] ?? false;
        const isActive = idx === activeIndex;
        const pill = STATUS_PILL[f.status];
        const PillIcon = pill.Icon;
        return (
          <section
            key={f.path}
            ref={(el) => { fileRefs.current[idx] = el; }}
            className={clsx(
              'overflow-hidden rounded border bg-bg-secondary/40 transition-colors',
              isActive ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-border-default',
            )}
          >
            <button
              type="button"
              onClick={() => { setActiveIndex(idx); toggle(f.path); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] hover:bg-bg-secondary"
              aria-expanded={isOpen}
            >
              <div className="flex min-w-0 items-center gap-2">
                <ChevronRight
                  className={clsx(
                    'h-3 w-3 shrink-0 text-text-muted transition-transform',
                    isOpen && 'rotate-90',
                  )}
                />
                <span
                  className={clsx(
                    'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium',
                    pill.className,
                  )}
                >
                  <PillIcon className="h-2.5 w-2.5" />
                  {pill.label}
                </span>
                <span className="truncate font-mono text-text-primary" title={f.path}>
                  {f.path}
                </span>
                {f.oldPath && (
                  <span className="truncate font-mono text-[10px] text-text-muted" title={`was: ${f.oldPath}`}>
                    ← {f.oldPath}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
                <span className="text-emerald-600 dark:text-emerald-400">+{f.additions}</span>
                <span className="text-red-600 dark:text-red-400">-{f.deletions}</span>
              </div>
            </button>
            {isOpen && (
              <pre className="overflow-x-auto border-t border-border-light bg-bg-primary/60 px-0 py-1 text-[10px] font-mono leading-relaxed">
                {f.lines.map((line: DiffLine, i: number) => (
                  <div
                    key={i}
                    className={clsx('whitespace-pre px-3', LINE_CLASS[line.kind])}
                  >
                    {line.text || '\u00a0'}
                  </div>
                ))}
              </pre>
            )}
          </section>
        );
      })}
    </div>
  );
}
