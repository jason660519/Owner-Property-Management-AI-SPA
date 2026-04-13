/**
 * @file Sheet.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Sheet/Drawer component for side panels
 */

'use client'

import React, { createContext, useContext } from 'react'
import { X } from 'lucide-react'

interface SheetContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = createContext<SheetContextType | undefined>(undefined)

export interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open = false, onOpenChange = () => {}, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export interface SheetContentProps {
  className?: string
  children: React.ReactNode
}

export function SheetContent({ className = '', children }: SheetContentProps) {
  const context = useContext(SheetContext)
  if (!context) throw new Error('SheetContent must be used within Sheet')

  if (!context.open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80"
        onClick={() => context.onOpenChange(false)}
      />

      {/* Sheet Content */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-bg-primary shadow-xl overflow-y-auto transition-colors duration-200 ${className}`}
      >
        {children}
      </div>
    </>
  )
}

export interface SheetHeaderProps {
  children: React.ReactNode
}

export function SheetHeader({ children }: SheetHeaderProps) {
  const context = useContext(SheetContext)
  if (!context) throw new Error('SheetHeader must be used within Sheet')

  return (
    <div className="flex items-center justify-between p-6 border-b border-border-default">
      <div className="flex-1">{children}</div>
      <button
        onClick={() => context.onOpenChange(false)}
        className="p-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

export interface SheetTitleProps {
  className?: string
  children: React.ReactNode
}

export function SheetTitle({ className = '', children }: SheetTitleProps) {
  return <h2 className={`text-xl font-semibold text-text-primary ${className}`}>{children}</h2>
}

export interface SheetDescriptionProps {
  className?: string
  children: React.ReactNode
}

export function SheetDescription({ className = '', children }: SheetDescriptionProps) {
  return <p className={`text-sm text-text-secondary mt-1 ${className}`}>{children}</p>
}
