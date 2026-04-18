// Row 145 Sprint 4b — search page person/record toggle tests.
// Maps to tdd-spec §4.4 (3 cases).

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PeopleDatabaseSearchWorkspace } from '../page';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type FetchMock = jest.Mock<Promise<Response>, [string | URL, RequestInit?]>;

/**
 * Installs a fetch mock that dispatches based on URL substring matching.
 * Matches are checked in insertion order; first hit wins.
 */
function installFetchRouter(routes: Record<string, () => Response>): FetchMock {
  const mock = jest.fn() as unknown as FetchMock;
  mock.mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const pattern of Object.keys(routes)) {
      if (url.includes(pattern)) return routes[pattern]();
    }
    throw new Error(`Unmocked fetch: ${url}`);
  });
  (global as unknown as { fetch: FetchMock }).fetch = mock;
  return mock;
}

const DATASET_TREE_RESPONSE = {
  tree: [
    { path: '台北市里長', label: '台北市里長', count: 1, depth: 0, children: [] },
  ],
};

const BATCHES_RESPONSE = { batches: [] };

function searchCalls(mock: FetchMock): Array<{ url: string; init?: RequestInit }> {
  return mock.mock.calls
    .filter((args) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].toString();
      return url.includes('/api/people-db/search');
    })
    .map((args) => ({
      url: typeof args[0] === 'string' ? args[0] : args[0].toString(),
      init: args[1],
    }));
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('PeopleDatabaseSearchWorkspace — person/record toggle', () => {
  it('defaults to person mode: search request carries ?group_by=person', async () => {
    const f = installFetchRouter({
      '/api/people-db/dataset-tree': () => jsonResponse(DATASET_TREE_RESPONSE),
      '/api/people-db/import/batches': () => jsonResponse(BATCHES_RESPONSE),
      '/api/people-db/search': () =>
        jsonResponse({ results: [], total: 0, page: 1, page_size: 20, group_by: 'person' }),
    });

    render(<PeopleDatabaseSearchWorkspace />);

    // Wait for datasets to populate — toggle is rendered after mount.
    await waitFor(() => expect(f).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '搜尋' }));

    await waitFor(() => expect(searchCalls(f).length).toBeGreaterThan(0));
    const last = searchCalls(f).slice(-1)[0];
    expect(last.url).toContain('group_by=person');
  });

  it('switching toggle to record refetches with ?group_by=record', async () => {
    const f = installFetchRouter({
      '/api/people-db/dataset-tree': () => jsonResponse(DATASET_TREE_RESPONSE),
      '/api/people-db/import/batches': () => jsonResponse(BATCHES_RESPONSE),
      '/api/people-db/search': () =>
        jsonResponse({ results: [], total: 0, page: 1, page_size: 20, group_by: 'record' }),
    });

    render(<PeopleDatabaseSearchWorkspace />);
    await waitFor(() => expect(f).toHaveBeenCalled());

    // Run an initial search in person mode.
    fireEvent.click(screen.getByRole('button', { name: '搜尋' }));
    await waitFor(() => expect(searchCalls(f).length).toBeGreaterThanOrEqual(1));

    // Switch to record mode — click the "依 record" toggle button.
    fireEvent.click(screen.getByRole('button', { name: '依 record 展開' }));

    await waitFor(() => {
      const last = searchCalls(f).slice(-1)[0];
      expect(last.url).toContain('group_by=record');
    });
  });

  it('expands the sources list when a person aggregate row is toggled open', async () => {
    const personResult = {
      results: [
        {
          person_id: 'p1',
          canonical_name: '闕貴卿',
          canonical_id_no: null,
          canonical_phones: [],
          canonical_address: null,
          source_count: 2,
          quality_score: null,
          sources: [
            { record_id: 'r1', full_name: '闕貴卿', data_source: '台北市里長', source_file_path: '/a.pdf' },
            { record_id: 'r2', full_name: '闕貴卿', data_source: '台北市里長', source_file_path: '/b.pdf' },
          ],
        },
      ],
      total: 2,
      page: 1,
      page_size: 20,
      group_by: 'person',
    };

    const f = installFetchRouter({
      '/api/people-db/dataset-tree': () => jsonResponse(DATASET_TREE_RESPONSE),
      '/api/people-db/import/batches': () => jsonResponse(BATCHES_RESPONSE),
      '/api/people-db/search': () => jsonResponse(personResult),
    });

    render(<PeopleDatabaseSearchWorkspace />);
    await waitFor(() => expect(f).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '搜尋' }));
    await waitFor(() => expect(screen.getByText('闕貴卿')).toBeInTheDocument());

    // Sources are collapsed initially.
    expect(screen.queryByText('/a.pdf')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /顯示 2 筆來源/ }));

    await waitFor(() => expect(screen.getByText('/a.pdf')).toBeInTheDocument());
    expect(screen.getByText('/b.pdf')).toBeInTheDocument();
  });
});
