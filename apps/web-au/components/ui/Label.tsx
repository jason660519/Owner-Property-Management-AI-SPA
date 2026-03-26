/**
 * @file Label.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Basic label component
 */

import React from 'react'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={`text-sm font-medium text-white ${className}`}
      {...props}
    >
      {children}
    </label>
  )
}
