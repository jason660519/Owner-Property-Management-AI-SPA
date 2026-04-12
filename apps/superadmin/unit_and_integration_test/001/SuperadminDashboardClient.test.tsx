/**
 * TDD Tests for SuperadminDashboardClient
 * Row 001: 超級管理員-儀表板
 *
 * Test IDs mapped to TDD spec (tdd-admin-dashboard-20260221.md):
 *   T-01: Dashboard renders correctly
 *   T-02: KPI card shows totalUsers (non-null)
 *   T-03: KPI card shows totalProperties
 *   T-06: Responsive grid layout
 *   T-08: Pending verification notification badge
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import SuperadminDashboardClient from '@/components/dashboard/SuperadminDashboardClient';
import type { AdminStats } from '@/lib/actions/dashboard-types';

// Mock heavy / server-only dependencies
jest.mock('@/components/dashboard/SystemGrowthChart', () => ({
  SystemGrowthChart: () => <div data-testid="system-growth-chart">Chart</div>,
}));

jest.mock('@/components/dashboard/ActivityLogTable', () => ({
  ActivityLogTable: () => <div data-testid="activity-log-table">ActivityLog</div>,
}));

jest.mock('@/components/dashboard', () => ({
  DashboardLayout: ({
    children,
    pageTitle,
    greeting,
    headerActions,
  }: {
    children: React.ReactNode;
    pageTitle: string;
    greeting?: React.ReactNode;
    headerActions?: React.ReactNode;
    currentRole?: string;
    breadcrumbs?: unknown[];
  }) => (
    <div>
      <h1>{pageTitle}</h1>
      {greeting && <div data-testid="greeting">{greeting}</div>}
      {headerActions && <div data-testid="header-actions">{headerActions}</div>}
      {children}
    </div>
  ),
}));

// Mock next/link to render a simple anchor
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockStats: AdminStats = {
  totalUsers: 42,
  totalGroups: 5,
  totalRoles: 8,
  superadminCount: 2,
  activeUsersCount: 30,
  onlineUsersCount: 10,
  totalProperties: 100,
  totalSales: 50,
  totalRentals: 50,
  overdueSalesCount: 3,
  overdueRentalsCount: 2,
  soldSalesCount: 10,
  totalBlogs: 25,
  surveyReportCountForSales: 30,
  salesContractsCount: 45,
  salesBlogCount: 20,
  surveyReportCountForRentals: 25,
  leaseContractsCount: 40,
  rentalBlogCount: 15,
  salesWithoutPhotoCount: 5,
  rentalsWithoutPhotoCount: 3,
  salesWithoutBlogCount: 10,
  rentalsWithoutBlogCount: 8,
  activeRentals: 35,
  activeListings: 45,
  totalRevenue: 500000,
  pendingVerifications: 7,
};

describe('SuperadminDashboardClient — Row 001 TDD', () => {
  // T-01: Dashboard renders correctly after login
  it('T-01: renders dashboard page title "系統概覽"', () => {
    render(<SuperadminDashboardClient stats={mockStats} />);
    expect(screen.getByText('系統概覽')).toBeInTheDocument();
  });

  // T-02: KPI card shows totalUsers (non-null value)
  it('T-02: shows total / active / online user counts in IAM card', () => {
    render(<SuperadminDashboardClient stats={mockStats} />);
    // Format: "42 / 30 / 10"
    expect(screen.getByText('42 / 30 / 10')).toBeInTheDocument();
  });

  // T-03: KPI card shows totalProperties
  it('T-03: shows total properties count in properties card', () => {
    render(<SuperadminDashboardClient stats={mockStats} />);
    expect(screen.getByText('IAM用戶群組概覽')).toBeInTheDocument();
    expect(screen.getByText('物件與部落格概覽')).toBeInTheDocument();
    // totalProperties = 100
    const cells = screen.getAllByText('100');
    expect(cells.length).toBeGreaterThan(0);
  });

  // T-06: Responsive grid layout present
  it('T-06: renders responsive grid layout for KPI cards', () => {
    const { container } = render(<SuperadminDashboardClient stats={mockStats} />);
    const grids = container.querySelectorAll('.grid');
    expect(grids.length).toBeGreaterThan(0);
  });

  // T-08: Pending verification notification badge
  it('T-08: shows pending verifications notification badge with correct count', () => {
    render(<SuperadminDashboardClient stats={mockStats} />);
    const badge = screen.getByTestId('pending-verifications-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('7');
  });

  // T-08 edge case: no badge when count is 0
  it('T-08: does not show notification banner when pendingVerifications is 0', () => {
    render(<SuperadminDashboardClient stats={{ ...mockStats, pendingVerifications: 0 }} />);
    expect(screen.queryByTestId('pending-verifications-badge')).not.toBeInTheDocument();
  });

  // Load error alert
  it('renders load error alert when loadError is provided', () => {
    render(<SuperadminDashboardClient stats={mockStats} loadError="測試錯誤訊息" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/測試錯誤訊息/)).toBeInTheDocument();
  });

  // User greeting
  it('shows user name in greeting when provided', () => {
    render(<SuperadminDashboardClient stats={mockStats} userName="Alice" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  // KPI cards rendered
  it('renders all four main KPI card categories', () => {
    render(<SuperadminDashboardClient stats={mockStats} />);
    expect(screen.getByText('IAM用戶群組概覽')).toBeInTheDocument();
    expect(screen.getByText('物件與部落格概覽')).toBeInTheDocument();
    expect(screen.getByText('出售物件概覽')).toBeInTheDocument();
    expect(screen.getByText('出租物件概覽')).toBeInTheDocument();
  });
});
