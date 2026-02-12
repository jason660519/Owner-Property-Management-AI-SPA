'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ProgressLink as ProgressLinkType } from './types';

export function ProgressLink({ link, className = '' }: { link: ProgressLinkType; className?: string }) {
  const href = link.query
    ? `${link.href}?${new URLSearchParams(link.query).toString()}`
    : link.href;
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm text-gray-500 dark:text-[#999999] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] hover:text-gray-900 dark:hover:text-white transition-all ${className}`}
    >
      <span className="flex items-center gap-2">
        {link.label}
        {link.badge && (
          <Badge variant={link.badge.variant} size="sm">
            {link.badge.count}
          </Badge>
        )}
      </span>
      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
