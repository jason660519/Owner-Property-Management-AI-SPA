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

describe('ToolsPage', () => {
  it('keeps people-db as a single integrated entry', () => {
    render(<ToolsPage />);

    const peopleDbCardTitle = screen.getByText('尋人資料庫工具');
    const peopleDbLink = peopleDbCardTitle.closest('a');

    expect(peopleDbLink).toHaveAttribute('href', '/superadmin/settings/people-database');
    expect(screen.queryByText('people-db 匯入資料')).not.toBeInTheDocument();
    expect(screen.queryByText('people-db 搜尋介面')).not.toBeInTheDocument();
  });
});
