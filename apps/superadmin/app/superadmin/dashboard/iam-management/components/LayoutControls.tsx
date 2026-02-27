'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlignLeft, Eye, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useIamViewSettings } from './viewSettings';

export function IAMLayoutControls() {
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [alignmentMode, setAlignmentMode] = useState<'left' | 'center' | 'right'>('left');
  const { freezeRowCount, frozenColCount, setFreezeRowCount, setFrozenColCount } = useIamViewSettings();

  const alignmentRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);

  // 關閉「排版」dropdown
  useEffect(() => {
    if (!alignmentOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (alignmentRef.current && !alignmentRef.current.contains(e.target as Node)) {
        setAlignmentOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlignmentOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [alignmentOpen]);

  // 關閉「View」dropdown
  useEffect(() => {
    if (!viewOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) {
        setViewOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [viewOpen]);

  return (
    <div className="flex items-center gap-2">
      {/* 排版 */}
      <div className="relative" ref={alignmentRef}>
        <button
          type="button"
          onClick={() => setAlignmentOpen(prev => !prev)}
          aria-expanded={alignmentOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          title="col位文字排版"
        >
          <AlignLeft className="w-3.5 h-3.5" />
          排版
          <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', alignmentOpen && 'rotate-180')} />
        </button>
        {alignmentOpen && (
          <div
            className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3"
            role="dialog"
            aria-label="col位排版"
          >
            <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
            <div className="flex gap-1 mb-3">
              {(['left', 'center', 'right'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAlignmentMode(mode)}
                  className={clsx(
                    'flex-1 px-2 py-1.5 rounded text-xs border transition-colors',
                    alignmentMode === mode
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                      : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                  )}
                >
                  {mode === 'left' ? '靠左' : mode === 'center' ? '左右置中' : '靠右'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted">
              目前僅作為顯示偏好記錄（{alignmentMode}），後續可擴充綁定各頁面的表格欄位對齊。
            </p>
          </div>
        )}
      </div>

      {/* View */}
      <div className="relative" ref={viewRef}>
        <button
          type="button"
          onClick={() => setViewOpen(prev => !prev)}
          aria-expanded={viewOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          title="檢視選項"
        >
          <Eye className="w-3.5 h-3.5" />
          View
          <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', viewOpen && 'rotate-180')} />
        </button>
        {viewOpen && (
          <div
            className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2"
            role="menu"
          >
            <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">
              凍結窗格
            </div>
            <div className="border-t border-border-light mt-1 pt-1">
              <div className="px-3 py-1 text-[10px] text-text-muted">列</div>
              {([0, 1] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFreezeRowCount(n)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    freezeRowCount === n
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                      : 'text-text-primary hover:bg-bg-secondary'
                  )}
                >
                  {n === 0 ? '不凍結列' : '凍結第 1 row'}
                </button>
              ))}
            </div>
            <div className="border-t border-border-light mt-1 pt-1">
              <div className="px-3 py-1 text-[10px] text-text-muted">col（亦可拖曳凍結線）</div>
              <div className="max-h-[240px] overflow-y-auto">
                {[
                  { n: 0, label: '不凍結col' },
                  { n: 1, label: '凍結第 1 col' },
                  { n: 2, label: '凍結第 1 ~ 2 col' },
                  { n: 3, label: '凍結第 1 ~ 3 col' },
                  { n: 4, label: '凍結第 1 ~ 4 col' },
                  { n: 5, label: '凍結第 1 ~ 5 col' },
                  { n: 6, label: '凍結第 1 ~ 6 col' },
                ].map(({ n, label }) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFrozenColCount(n)}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      frozenColCount === n
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                        : 'text-text-primary hover:bg-bg-secondary'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-3 pt-2 text-[11px] text-text-muted">
              目前套用至 Roles 矩陣表格（列：{freezeRowCount}，col：{frozenColCount}）。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

