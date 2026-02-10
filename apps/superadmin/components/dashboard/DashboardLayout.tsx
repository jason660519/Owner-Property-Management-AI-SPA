'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

export function DashboardLayout({
  pageTitle,
  breadcrumbs,
  greeting,
  children,
  headerActions,
  currentRole, // Added currentRole
  className = '',
}: {
  pageTitle: string;
  breadcrumbs: { label: string; href?: string }[];
  greeting?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  currentRole?: string; // Added type definition
  className?: string;
}) {
  return (
    <div className={`flex-1 ${className}`}>
      <div className="bg-[#1F1F1F] border-b border-[#333333] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <Link href={crumb.href} className="text-[#999999] hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-[#666666]" />}
              </React.Fragment>
            ))}
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{pageTitle}</h1>
              {greeting && <p className="text-sm text-[#999999]">{greeting}</p>}
            </div>
            <div className="flex items-center gap-4">
              {headerActions}
              <a
                href={MAIN_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#999999] hover:text-white border border-[#333333] rounded-lg hover:border-[#7C3AED] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                前往主站 (房東/租客/買家)
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
