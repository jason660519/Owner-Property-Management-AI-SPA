/**
 * @file Select.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Basic select dropdown component
 */

'use client'

import React, { createContext, useContext, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectContextType {
  value: string
  onChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = createContext<SelectContextType | undefined>(undefined)

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  children: React.ReactNode
}

export function Select({
  value: controlledValue,
  onValueChange,
  defaultValue = '',
  children,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)

  const value = controlledValue !== undefined ? controlledValue : internalValue
  const onChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value, onChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SelectTrigger({ className = '', children, ...props }: SelectTriggerProps) {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectTrigger must be used within Select')

  return (
    <button
      type="button"
      className={`flex items-center justify-between w-full px-3 py-2 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white hover:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] ${className}`}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
      <ChevronDown className="w-4 h-4 ml-2" />
    </button>
  )
}

export function SelectValue({ placeholder = 'Select...' }: { placeholder?: string }) {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectValue must be used within Select')

  return <span>{context.value || placeholder}</span>
}

export interface SelectContentProps {
  children: React.ReactNode
}

export function SelectContent({ children }: SelectContentProps) {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectContent must be used within Select')

  if (!context.open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => context.setOpen(false)}
      />
      {/* Dropdown */}
      <div className="absolute z-50 w-full mt-1 bg-[#2A2A2A] border border-[#333333] rounded-lg shadow-lg max-h-60 overflow-auto">
        {children}
      </div>
    </>
  )
}

export interface SelectItemProps {
  value: string
  children: React.ReactNode
}

export function SelectItem({ value, children }: SelectItemProps) {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectItem must be used within Select')

  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-[#333333] ${
        context.value === value ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-white'
      }`}
      onClick={() => context.onChange(value)}
    >
      {children}
    </div>
  )
}
