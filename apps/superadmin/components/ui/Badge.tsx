import React from 'react';

export function Badge({
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'default' | 'sm';
}) {
  const variantClasses = {
    default: 'bg-[#333333] text-white',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    error: 'bg-red-500/20 text-red-500',
    info: 'bg-blue-500/20 text-blue-500',
  };
  const sizeClasses = {
    default: 'px-2 py-1 text-xs',
    sm: 'px-1.5 py-0.5 text-[10px]',
  };
  return (
    <span
      className={`inline-flex items-center font-medium rounded ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
