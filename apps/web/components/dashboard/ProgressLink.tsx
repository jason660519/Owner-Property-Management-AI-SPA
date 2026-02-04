/**
 * @file ProgressLink.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Progress link component for KPI cards navigation
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { ProgressLink as ProgressLinkType } from './types'

interface ProgressLinkProps {
  link: ProgressLinkType
  className?: string
}

/**
 * ProgressLink Component
 *
 * Displays a clickable link with optional badge for navigation from KPI cards
 *
 * @example
 * <ProgressLink
 *   link={{
 *     label: "查看所有物件",
 *     href: "/landlord/properties",
 *     badge: { count: 12, variant: "info" }
 *   }}
 * />
 */
export function ProgressLink({ link, className = '' }: ProgressLinkProps) {
  // Build URL with query params if provided
  const buildHref = () => {
    if (!link.query) return link.href

    const params = new URLSearchParams(link.query)
    return `${link.href}?${params.toString()}`
  }

  return (
    <Link
      href={buildHref()}
      className={`
        group flex items-center justify-between
        px-3 py-2 rounded-md
        text-sm text-[#999999]
        hover:bg-[#2A2A2A] hover:text-white
        transition-all duration-200
        ${className}
      `}
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
  )
}
