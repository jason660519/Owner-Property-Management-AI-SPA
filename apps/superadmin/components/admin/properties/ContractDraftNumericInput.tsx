'use client';

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | '';
  onChange: (value: number | '') => void;
  allowDecimal?: boolean;
  allowEmpty?: boolean;
}

function clampValue(value: number, min?: number, max?: number) {
  let v = value;
  if (typeof min === 'number') v = Math.max(min, v);
  if (typeof max === 'number') v = Math.min(max, v);
  return v;
}

function sanitize(raw: string, allowDecimal: boolean) {
  if (!allowDecimal) {
    const cleaned = raw.replace(/[^0-9]/g, '');
    // Remove leading zeros (e.g. '05' → '5'), but keep lone '0'
    return cleaned.replace(/^0+(\d)/, '$1');
  }
  const s = raw.replace(/[^0-9.]/g, '');
  const [int, ...dec] = s.split('.');
  const cleanedInt = int.replace(/^0+(\d)/, '$1');
  return dec.length === 0 ? cleanedInt : `${cleanedInt}.${dec.join('')}`;
}

export function NumericInput({
  value,
  onChange,
  allowDecimal = false,
  allowEmpty = false,
  min,
  max,
  inputMode,
  ...restProps
}: NumericInputProps) {
  const [localText, setLocalText] = useState(() => (value === '' ? '' : String(value)));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) setLocalText(value === '' ? '' : String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = sanitize(e.target.value, allowDecimal);
    setLocalText(s);
    if (s === '' || s === '.') {
      if (allowEmpty) onChange('');
      return;
    }
    const parsed = allowDecimal ? Number(s) : Number.parseInt(s, 10);
    if (Number.isFinite(parsed)) onChange(clampValue(parsed, min as number | undefined, max as number | undefined));
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    isFocused.current = false;
    const s = sanitize(e.target.value, allowDecimal);
    if (s === '' || s === '.') {
      if (allowEmpty) { setLocalText(''); onChange(''); }
      else {
        const fallback = clampValue(typeof min === 'number' ? min : 0, min as number | undefined, max as number | undefined);
        setLocalText(String(fallback)); onChange(fallback);
      }
      restProps.onBlur?.(e);
      return;
    }
    const parsed = allowDecimal ? Number(s) : Number.parseInt(s, 10);
    if (Number.isFinite(parsed)) {
      const n = clampValue(parsed, min as number | undefined, max as number | undefined);
      setLocalText(String(n)); onChange(n);
    }
    restProps.onBlur?.(e);
  }

  return (
    <input
      {...restProps}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
      value={localText}
      onFocus={(e) => { isFocused.current = true; e.target.select(); restProps.onFocus?.(e); }}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );
}
