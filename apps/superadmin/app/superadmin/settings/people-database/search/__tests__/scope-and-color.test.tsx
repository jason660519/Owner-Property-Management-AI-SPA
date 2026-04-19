// Row 146 Step 4 — verify the search workspace defaults to "search-all"
// when no datasets are picked, surfaces a scope hint banner, and renders
// DatasetBadge chips on result rows.
//
// We don't try to drive the EnhancedTable to render — that's a separate
// component with its own coverage. Instead we mock fetch responses to
// confirm the scope banner state + verify DatasetBadge is mounted in the
// import-batches panel (which renders unconditionally once batches resolve).

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PeopleDatabaseSearchWorkspace } from '../page';

jest.mock('@/components/dashboard', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// EnhancedTable is heavy and not the focus here — stub it.
jest.mock('@/components/ui/EnhancedTable', () => ({
  __esModule: true,
  default: () => <div data-testid="enhanced-table-stub" />,
}));

// DatasetTreePanel — keep its real selection callback so we can simulate
// adding a selection, but stub its visual tree.
jest.mock('@/components/people-database/DatasetTreePanel', () => ({
  __esModule: true,
  default: ({
    onChange,
    selectedPaths,
  }: {
    onChange: (next: string[]) => void;
    selectedPaths: string[];
  }) => (
    <div data-testid="dataset-tree-panel">
      <span data-testid="tree-selected-count">{selectedPaths.length}</span>
      <button
        type="button"
        onClick={() => onChange(['企業名錄'])}
        data-testid="tree-pick-one"
      >
        pick-企業名錄
      </button>
    </div>
  ),
}));

interface FetchOpts {
  importBatches?: Array<{
    batch_id: string;
    label: string | null;
    data_source: string | null;
    status: string | null;
    processed_records: number;
    total_records: number;
    created_at: string | null;
  }>;
}

function setupFetchMocks({ importBatches = [] }: FetchOpts = {}) {
  const fetchImpl = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/people-db/dataset-tree')) {
      return { ok: true, json: async () => ({ tree: [] }) } as Response;
    }
    if (url.includes('/api/people-db/datasets')) {
      return { ok: true, json: async () => ({ datasets: [] }) } as Response;
    }
    if (url.includes('/api/people-db/import/batches')) {
      // Workspace expects { batches: [...] } per ImportBatchListResponse.
      return {
        ok: true,
        json: async () => ({ batches: importBatches }),
      } as Response;
    }
    if (url.includes('/api/people-db/search')) {
      return {
        ok: true,
        json: async () => ({
          results: [],
          total: 0,
          page: 1,
          page_size: 20,
          group_by: 'record',
        }),
      } as Response;
    }
    return { ok: true, json: async () => ({}) } as Response;
  });
  global.fetch = fetchImpl as unknown as typeof fetch;
  return fetchImpl;
}

describe('PeopleDatabaseSearchWorkspace — Row 146 scope + color badge', () => {
  it('renders the scope banner showing "全部資料集" by default', async () => {
    setupFetchMocks();
    render(<PeopleDatabaseSearchWorkspace />);
    await waitFor(() => {
      expect(screen.getByTestId('scope-banner')).toBeInTheDocument();
    });
    expect(screen.getByTestId('scope-banner').textContent).toMatch(/全部資料集（預設）/);
  });

  it('switches to "N 個資料集" once a dataset is selected from the tree panel', async () => {
    setupFetchMocks();
    render(<PeopleDatabaseSearchWorkspace />);
    await waitFor(() => expect(screen.getByTestId('scope-banner')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('tree-pick-one'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-banner').textContent).toMatch(/1 個資料集/);
    });
    // Clear-selection link should appear so user can flip back to search-all.
    expect(screen.getByText(/清除選取/)).toBeInTheDocument();
  });

  it('clear-selection link returns scope to "全部資料集"', async () => {
    setupFetchMocks();
    render(<PeopleDatabaseSearchWorkspace />);
    await waitFor(() => expect(screen.getByTestId('scope-banner')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('tree-pick-one'));
    await waitFor(() => expect(screen.getByText(/清除選取/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/清除選取/));
    await waitFor(() => {
      expect(screen.getByTestId('scope-banner').textContent).toMatch(/全部資料集（預設）/);
    });
  });

  it('renders DatasetBadge with the dataset path on import batches list', async () => {
    setupFetchMocks({
      importBatches: [
        {
          batch_id: 'b-1',
          label: '2026Q1 北市',
          data_source: '企業名錄',
          status: 'done',
          processed_records: 10,
          total_records: 10,
          created_at: '2026-04-19T00:00:00Z',
        },
      ],
    });
    render(<PeopleDatabaseSearchWorkspace />);
    await waitFor(() => {
      const badges = screen.getAllByTestId('dataset-badge');
      const matching = badges.find(
        (el) => el.getAttribute('data-dataset-path') === '企業名錄',
      );
      expect(matching).toBeDefined();
      expect(matching!.textContent).toBe('企業名錄');
    });
  });
});
