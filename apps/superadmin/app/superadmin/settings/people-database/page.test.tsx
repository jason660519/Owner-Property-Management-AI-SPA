import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PeopleDatabasePage from './page';

// Strip DashboardLayout chrome so the test only sees the workspace shell.
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

// Stub each lazy-loaded workspace so dynamic() resolves synchronously in tests.
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    const Stub: React.FC = () => {
      // Resolve synchronously by inspecting the loader source string
      const src = loader.toString();
      if (src.includes('./search/page')) return <div data-testid="search-workspace">search workspace</div>;
      if (src.includes('./import/page')) return <div data-testid="import-workspace">import workspace</div>;
      if (src.includes('./sources/page'))
        return <div data-testid="sources-workspace">sources workspace</div>;
      return <div data-testid="unknown-workspace" />;
    };
    return Stub;
  },
}));

// Helper: render then await the stats fetch so React state settles before
// assertions — avoids `act(...)` warnings from the unawaited useEffect.
async function renderAndSettle() {
  const result = render(<PeopleDatabasePage />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  // Allow the .then(setStats) microtask to flush.
  await waitFor(() => expect(screen.queryByText('總筆數')).toBeInTheDocument());
  return result;
}

describe('PeopleDatabasePage (Row 146 — 5-tab consolidation)', () => {
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

  it('renders primary navigation controls', async () => {
    await renderAndSettle();
    const primaryNavButtons = screen
      .getAllByRole('button')
      .slice(0, 2)
      .map((button) => button.textContent?.trim());

    expect(primaryNavButtons).toEqual(['匯入', '搜尋']);
  });

  it('places import before search in the workspace navigation', async () => {
    await renderAndSettle();
    const navButtons = screen
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter(Boolean);

    expect(navButtons.indexOf('匯入')).toBeLessThan(navButtons.indexOf('搜尋'));
  });

  it('defaults to the search workspace expanded', async () => {
    await renderAndSettle();
    expect(screen.getByTestId('search-workspace')).toBeInTheDocument();
  });

  it('switches expanded workspace when a section control is clicked', async () => {
    await renderAndSettle();
    fireEvent.click(screen.getAllByRole('button', { name: '匯入' })[0]);
    await waitFor(() => expect(screen.getByTestId('import-workspace')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: '資料來源' })[0]);
    await waitFor(() => expect(screen.getByTestId('sources-workspace')).toBeInTheDocument());
  });

  it('renders stats summary cards once /api/people-db/stats resolves', async () => {
    await renderAndSettle();
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('118')).toBeInTheDocument();
    expect(screen.getByText('總筆數')).toBeInTheDocument();
  });
});
