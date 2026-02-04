/**
 * @file Toast.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Toast notification component
 */

'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  description?: string
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      hideToast(id)
    }, 5000)
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} hideToast={hideToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({
  toasts,
  hideToast,
}: {
  toasts: Toast[]
  hideToast: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  }

  const colors = {
    success: 'bg-green-500/10 border-green-500',
    error: 'bg-red-500/10 border-red-500',
    info: 'bg-blue-500/10 border-blue-500',
  }

  return (
    <div
      className={`min-w-[300px] max-w-[400px] p-4 rounded-lg border ${colors[toast.type]} backdrop-blur-sm animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        {icons[toast.type]}
        <div className="flex-1">
          <p className="text-white font-medium">{toast.message}</p>
          {toast.description && (
            <p className="text-sm text-[#999999] mt-1">{toast.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#999999] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Add animation to globals.css:
// @keyframes slide-in-right {
//   from {
//     transform: translateX(100%);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
// .animate-slide-in-right {
//   animation: slide-in-right 0.3s ease-out;
// }
