/**
 * @file Badge.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Basic badge component
 */

import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'secondary' | 'destructive'
}

export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-[#333333] text-white',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    error: 'bg-red-500/20 text-red-500',
    secondary: 'bg-[#2A2A2A] text-[#999999]',
    destructive: 'bg-red-500/20 text-red-500',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
