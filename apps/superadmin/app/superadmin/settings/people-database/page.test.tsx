import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import PeopleDatabasePage from './page';

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

jest.mock('./import/page', () => ({
  PeopleDatabaseImportWorkspace: () => <div data-testid="import-workspace">import workspace</div>,
}));

jest.mock('./search/page', () => ({
  PeopleDatabaseSearchWorkspace: () => <div data-testid="search-workspace">search workspace</div>,
}));

describe('PeopleDatabasePage', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_records: 120,
        total_sources: 3,
        avg_quality_score: 82,
        indexed_records: 118,
      }),
    }) as jest.Mock;
  });

  it('renders import/search in one page tabs', async () => {
    render(<PeopleDatabasePage />);

    expect(await screen.findByRole('button', { name: '匯入資料' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搜尋資料' })).toBeInTheDocument();
    expect(screen.getByTestId('import-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('search-workspace')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '搜尋資料' }));
    expect(screen.getByTestId('search-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('import-workspace')).not.toBeInTheDocument();
  });
});
