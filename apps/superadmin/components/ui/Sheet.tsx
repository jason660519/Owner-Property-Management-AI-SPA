'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextType | undefined>(undefined);

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open = false, onOpenChange = () => {}, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export interface SheetContentProps {
  className?: string;
  children: React.ReactNode;
}

export function SheetContent({ className = '', children }: SheetContentProps) {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetContent must be used within Sheet');

  // Track mount state to safely use createPortal (SSR-safe)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!context.open || !mounted) return null;

  // Render directly into document.body to escape any parent stacking context
  return createPortal(
    <>
      {/* Backdrop — sits above everything */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        className="bg-black/80"
        onClick={() => context.onOpenChange(false)}
      />

      {/* Sheet panel — on top of backdrop */}
      <div
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9999 }}
        className={`w-full sm:max-w-md bg-bg-primary shadow-xl overflow-y-auto ${className}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export interface SheetHeaderProps {
  children: React.ReactNode;
}

export function SheetHeader({ children }: SheetHeaderProps) {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetHeader must be used within Sheet');

  return (
    <div className="flex items-center justify-between p-6 border-b border-border-subtle">
      <div className="flex-1">{children}</div>
      <button
        onClick={() => context.onOpenChange(false)}
        className="p-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export interface SheetTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function SheetTitle({ className = '', children }: SheetTitleProps) {
  return <h2 className={`text-base font-semibold text-text-primary ${className}`}>{children}</h2>;
}

export interface SheetDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function SheetDescription({ className = '', children }: SheetDescriptionProps) {
  return <p className={`text-xs text-text-secondary mt-1 ${className}`}>{children}</p>;
}
