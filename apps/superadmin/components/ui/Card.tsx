'use client';

import React from 'react';

export function Card({
  children,
  className = '',
  padding = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];
  return (
    <div className={`bg-[#2A2A2A] border border-[#333333] rounded-xl ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-white ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
