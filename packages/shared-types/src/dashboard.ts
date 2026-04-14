import type { ComponentType, SVGProps } from 'react';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type BadgeVariant = 'info' | 'warning' | 'success' | 'error' | 'default';

export interface ProgressLink {
  label: string;
  href: string;
  query?: Record<string, string>;
  badge?: { count: number; variant: BadgeVariant };
}

export interface TrendIndicator {
  value: number;
  direction: 'up' | 'down';
  label: string;
}

export interface KPIConfig {
  title: string;
  value: number | string;
  icon: IconComponent;
  color: string;
  trend?: TrendIndicator;
  progressLinks: ProgressLink[];
}

export interface KPILoadingState {
  isLoading: boolean;
  error?: string;
  isEmpty?: boolean;
}
