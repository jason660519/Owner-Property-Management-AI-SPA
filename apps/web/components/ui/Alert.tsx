/**
 * @file Alert.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Alert component for displaying notifications
 */

import React from 'react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'destructive'
}

export function Alert({
  className = '',
  variant = 'default',
  children,
  ...props
}: AlertProps) {
  const variantClasses = {
    default: 'bg-[#2A2A2A] border-[#333333] text-white',
    success: 'bg-green-500/10 border-green-500 text-green-500',
    warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-500',
    error: 'bg-red-500/10 border-red-500 text-red-500',
    destructive: 'bg-red-500/10 border-red-500 text-red-500',
  }

  return (
    <div
      className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({
  className = '',
  children,
  ...props
}: AlertDescriptionProps) {
  return (
    <p className={`text-sm ${className}`} {...props}>
      {children}
    </p>
  )
}
