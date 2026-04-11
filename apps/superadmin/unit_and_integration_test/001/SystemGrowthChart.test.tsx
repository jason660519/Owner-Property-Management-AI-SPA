/**
 * TDD Tests for SystemGrowthChart
 * Row 001: 超級管理員-儀表板
 *
 * Test IDs mapped to TDD spec (tdd-admin-dashboard-20260221.md):
 *   T-09: Date range filter updates chart data
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemGrowthChart } from '@/components/dashboard/SystemGrowthChart';

describe('SystemGrowthChart — Row 001 TDD', () => {
  it('renders the chart with title', () => {
    render(<SystemGrowthChart />);
    expect(screen.getByText('系統成長趨勢')).toBeInTheDocument();
  });

  it('renders chart bar items', () => {
    const { container } = render(<SystemGrowthChart />);
    // Each month has user + active bar
    const bars = container.querySelectorAll('[data-testid^="bar-"]');
    expect(bars.length).toBeGreaterThan(0);
  });

  // T-09: Date range filter controls are rendered
  it('T-09: renders date range filter control', () => {
    render(<SystemGrowthChart />);
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
  });

  it('T-09: date range filter shows 30天, 90天, 180天 options', () => {
    render(<SystemGrowthChart />);
    expect(screen.getByText('30天')).toBeInTheDocument();
    expect(screen.getByText('90天')).toBeInTheDocument();
    expect(screen.getByText('180天')).toBeInTheDocument();
  });

  it('T-09: 30天 is selected by default', () => {
    render(<SystemGrowthChart />);
    const btn30 = screen.getByText('30天').closest('button');
    expect(btn30).toHaveAttribute('data-active', 'true');
  });

  it('T-09: clicking 90天 makes it the active range', () => {
    render(<SystemGrowthChart />);
    const btn90 = screen.getByText('90天').closest('button');
    fireEvent.click(btn90!);
    expect(btn90).toHaveAttribute('data-active', 'true');
  });

  it('T-09: clicking 180天 updates active range', () => {
    render(<SystemGrowthChart />);
    const btn180 = screen.getByText('180天').closest('button');
    fireEvent.click(btn180!);
    expect(btn180).toHaveAttribute('data-active', 'true');
    // After switching, 30天 should not be active
    const btn30 = screen.getByText('30天').closest('button');
    expect(btn30).toHaveAttribute('data-active', 'false');
  });

  it('renders legend labels', () => {
    render(<SystemGrowthChart />);
    expect(screen.getByText('總用戶數')).toBeInTheDocument();
    expect(screen.getByText('活躍用戶')).toBeInTheDocument();
  });
});
