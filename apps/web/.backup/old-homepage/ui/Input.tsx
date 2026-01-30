import React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 bg-[#2A2A2A] border rounded-lg text-white placeholder-[#666666]',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent',
            'transition-colors',
            error ? 'border-red-500' : 'border-[#333333]',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-[#999999]">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
