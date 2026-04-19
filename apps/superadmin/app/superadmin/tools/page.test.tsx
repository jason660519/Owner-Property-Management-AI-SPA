import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ToolsPage from './page';

jest.mock('@/components/dashboard', () => ({
  DashboardLayout: ({
    children,
    pageTitle,
  }: {
    children: React.ReactNode;
    pageTitle?: string;
  }) => (
    <div data-testid="dashboard-layout">
      {pageTitle ? <h1>{pageTitle}</h1> : null}
      {children}
    </div>
  ),
}));

describe('ToolsPage (Row 146 — people-db moved out)', () => {
  it('does NOT render the people-db card (Sidebar provides direct entry now)', () => {
    render(<ToolsPage />);
    expect(screen.queryByText('尋人資料庫工具')).not.toBeInTheDocument();
  });

  it('still renders the FP-to-PDF and File Manager cards', () => {
    render(<ToolsPage />);

    const fpTitle = screen.getByText('FP 轉 PDF 功能');
    expect(fpTitle.closest('a')).toHaveAttribute(
      'href',
      '/superadmin/settings/fp-converter',
    );

    const fmTitle = screen.getByText('檔案整理與歸檔系統');
    expect(fmTitle.closest('a')).toHaveAttribute(
      'href',
      '/superadmin/tools/file-manager',
    );
  });
});
