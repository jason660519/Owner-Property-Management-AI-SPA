// Row 146 Step 4 — visual chip for a dataset path.
//
// Color is hashed deterministically from the path so the same dataset shows
// the same color everywhere (search results, person-mode source list,
// import batch panel). Falls back to a neutral grey for empty / null.
//
// Inline styles intentionally — Tailwind can't generate the runtime hue, and
// dataset colors are runtime-derived.

import React from 'react';
import { datasetColorStyle } from '@/lib/people-db/dataset-color';

interface DatasetBadgeProps {
  /** Canonical dataset path or root label. Empty / null renders a 「—」 chip. */
  path: string | null | undefined;
  /** Optional label override (defaults to the path). */
  label?: string;
  /** Render as an inline span (default) or block-level element. */
  block?: boolean;
  className?: string;
}

export default function DatasetBadge({
  path,
  label,
  block,
  className,
}: DatasetBadgeProps) {
  const display = label ?? path ?? '—';
  const style = datasetColorStyle(path);
  return (
    <span
      data-testid="dataset-badge"
      data-dataset-path={path ?? ''}
      style={style}
      className={`${block ? 'block' : 'inline-block'} max-w-full truncate rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${className ?? ''}`}
      title={path ?? undefined}
    >
      {display}
    </span>
  );
}
