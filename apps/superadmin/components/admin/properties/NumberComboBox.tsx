'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface NumberComboBoxProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}

/**
 * Numeric combo-box with a free-text input + quick-pick dropdown.
 *
 * Design decisions (TDD-driven):
 * - Input is UNCONTROLLED internally (no React `value` prop on the <input>).
 *   This prevents React reconciliation from fighting the browser during typing.
 * - Parent state is only updated on blur, not on every keystroke.
 * - External value changes are pushed to the DOM via ref when the input is
 *   not focused (useEffect + document.activeElement guard).
 * - Dropdown is rendered in a portal with position:fixed so it is not clipped
 *   by ancestor overflow (e.g. overflow-x-auto toolbars); options need no
 *   inner scroll for 0–6.
 */
export function NumberComboBox({ value, onChange, min = 0 }: NumberComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options = [0, 1, 2, 3, 4, 5, 6];

  const updateMenuPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Sync external value → DOM when NOT focused (e.g., dropdown selection from
  // another code path, or parent resets the field).
  useEffect(() => {
    const el = inputRef.current;
    if (el && el !== document.activeElement) {
      el.value = String(value);
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updateMenuPosition]);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function commit(rawValue: string) {
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) {
      // Revert display to last committed value without calling onChange
      if (inputRef.current) inputRef.current.value = String(value);
      return;
    }
    const num = Math.max(min, parseInt(digits, 10));
    if (inputRef.current) inputRef.current.value = String(num);
    onChange(num);
  }

  function selectOption(n: number) {
    if (inputRef.current) inputRef.current.value = String(n);
    onChange(n);
    setOpen(false);
  }

  const dropdown =
    open &&
    menuPos &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={menuRef}
        className="fixed z-[300] rounded-md border border-border-default bg-bg-primary py-1 shadow-lg"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          minWidth: '4rem',
        }}
      >
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectOption(n)}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              value === n
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-text-primary hover:bg-bg-secondary'
            }`}
          >
            {n}
          </button>
        ))}
      </div>,
      document.body,
    );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          defaultValue={String(value)}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            // Block non-numeric keys (allow control keys for UX)
            const ctrl = e.ctrlKey || e.metaKey;
            const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
                         'Tab', 'Home', 'End', 'Enter'].includes(e.key);
            const isDigit = /^\d$/.test(e.key);
            if (!isDigit && !nav && !ctrl) e.preventDefault();
          }}
          className="w-full border border-border-default rounded-l-md px-2 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 border border-l-0 border-border-default rounded-r-md px-1.5 bg-bg-primary hover:bg-bg-secondary text-text-secondary transition-colors focus:outline-none focus:border-accent"
          tabIndex={-1}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {dropdown}
    </div>
  );
}
