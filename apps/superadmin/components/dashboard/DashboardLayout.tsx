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
  greeting?: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  currentRole?: string; // Added type definition
  className?: string;
}) {
  return (
    <div className={`flex-1 ${className}`}>
      <div className="bg-bg-tertiary border-b border-border-default px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <Link href={crumb.href} className="text-text-secondary hover:text-text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-primary font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted" />}
              </React.Fragment>
            ))}
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">{pageTitle}</h1>
              {greeting && <p className="text-sm text-text-secondary">{greeting}</p>}
            </div>
            <div className="flex items-center gap-4">
              {headerActions}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
