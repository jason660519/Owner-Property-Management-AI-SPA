'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressLink } from './ProgressLink';
import type { KPIConfig, KPILoadingState } from './types';

export function KPICard({
  config,
  loading,
  className = '',
}: {
  config: KPIConfig;
  loading?: KPILoadingState;
  className?: string;
}) {
  const { title, value, icon: Icon, color, trend, progressLinks } = config;

  if (loading?.isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </Card>
    );
  }
  if (loading?.error) {
    return (
      <Card className={`p-6 border-red-500 ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-sm text-red-500 mb-2">載入失敗</p>
          <p className="text-xs text-text-muted">{loading.error}</p>
        </div>
      </Card>
    );
  }
  if (loading?.isEmpty) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-bg-tertiary">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
          </div>
        </div>
        <p className="text-2xl font-bold text-text-primary mb-4">-</p>
        <p className="text-sm text-text-muted">暫無資料</p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 hover:border-accent/50 transition-all ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-bg-tertiary">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-3xl font-bold text-text-primary">{value}</p>
      </div>
      {trend && (
        <div className="mb-4 flex items-center gap-2">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-text-muted">{trend.label}</span>
        </div>
      )}
      {progressLinks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-default space-y-1">
          {progressLinks.map((link, index) => (
            <ProgressLink key={index} link={link} />
          ))}
        </div>
      )}
    </Card>
  );
}
