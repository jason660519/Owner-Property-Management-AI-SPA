// Row 145 Sprint 6 — IngestDashboardWorkspace component tests.
// Maps to tdd-spec §6.2 (3 cases):
//   1. Stage count cards render mock API numbers (pending / parsed / failed)
//   2. Clicking retry hits POST /api/people-db/ingest/retry/{fileId}
//   3. Runs timeline lists failed/succeeded runs with status-appropriate Badge

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { IngestDashboardWorkspace } from '../page';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type FetchMock = jest.Mock<Promise<Response>, [string | URL, RequestInit?]>;

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

const EMPTY_FILES = { items: [], total: 0 };
const EMPTY_RUNS = { items: [] };

beforeEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------

describe('IngestDashboardWorkspace — stage count cards', () => {
  it('renders counts from /api/people-db/ingest/stage-counts into cards', async () => {
    installFetchRouter({
      '/api/people-db/ingest/stage-counts': () =>
        jsonResponse({
          counts: {
            pending: 42,
            parsing: 3,
            parsed: 1500,
            ocr_queued: 7,
            normalized: 1200,
            resolved: 900,
            indexed: 800,
            failed: 5,
            skipped_unsupported: 0,
            skipped_duplicate: 0,
            missing: 0,
          },
          total: 4457,
        }),
      '/api/people-db/ingest/files': () => jsonResponse(EMPTY_FILES),
      '/api/people-db/ingest/runs': () => jsonResponse(EMPTY_RUNS),
    });

    render(<IngestDashboardWorkspace />);

    // Cards render immediately with 0 (initial counts state = {}); wait
    // for the stage-counts fetch to resolve and re-render with real values.
    await waitFor(() => {
      const pendingCard = screen.getByTestId('stage-count-pending');
      expect(within(pendingCard).getByText('42')).toBeInTheDocument();
    });

    const parsedCard = screen.getByTestId('stage-count-parsed');
    expect(within(parsedCard).getByText('1500')).toBeInTheDocument();

    const failedCard = screen.getByTestId('stage-count-failed');
    expect(within(failedCard).getByText('5')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------

describe('IngestDashboardWorkspace — retry failed file', () => {
  it('POSTs /api/people-db/ingest/retry/{fileId} when retry button clicked', async () => {
    const f = installFetchRouter({
      '/api/people-db/ingest/stage-counts': () =>
        jsonResponse({ counts: { failed: 1 }, total: 1 }),
      '/api/people-db/ingest/files': () =>
        jsonResponse({
          items: [
            {
              id: 'file-abc',
              source_path: '/nas/taiwan-persons/a.mdb',
              ext: '.mdb',
              status: 'failed',
              attempts: 3,
              error_msg: 'mdb-tools crash',
            },
          ],
          total: 1,
        }),
      '/api/people-db/ingest/runs': () => jsonResponse(EMPTY_RUNS),
      '/api/people-db/ingest/retry/file-abc': () =>
        jsonResponse({ ok: true, id: 'file-abc' }),
    });

    render(<IngestDashboardWorkspace />);

    const retryBtn = await screen.findByTestId('retry-btn-file-abc');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      const retryCall = f.mock.calls.find((args) => {
        const url = typeof args[0] === 'string' ? args[0] : args[0].toString();
        return url.includes('/api/people-db/ingest/retry/file-abc');
      });
      expect(retryCall).toBeDefined();
      expect(retryCall?.[1]?.method).toBe('POST');
    });
  });
});

// ---------------------------------------------------------------------------

describe('IngestDashboardWorkspace — runs timeline', () => {
  it('renders one row per run with status label visible', async () => {
    installFetchRouter({
      '/api/people-db/ingest/stage-counts': () =>
        jsonResponse({ counts: {}, total: 0 }),
      '/api/people-db/ingest/files': () => jsonResponse(EMPTY_FILES),
      '/api/people-db/ingest/runs': () =>
        jsonResponse({
          items: [
            {
              id: 'run-1',
              stage: 'parse',
              status: 'failed',
              started_at: '2026-04-19T08:00:00Z',
              finished_at: '2026-04-19T08:02:00Z',
              processed: 0,
              failed: 1,
              notes: 'exit code 2',
            },
            {
              id: 'run-2',
              stage: 'scan',
              status: 'succeeded',
              started_at: '2026-04-19T07:50:00Z',
              finished_at: '2026-04-19T07:51:00Z',
              processed: 42,
              failed: 0,
              notes: null,
            },
          ],
        }),
    });

    render(<IngestDashboardWorkspace />);

    const failedRow = await screen.findByTestId('run-row-run-1');
    expect(within(failedRow).getByText('failed')).toBeInTheDocument();
    expect(within(failedRow).getByText('parse')).toBeInTheDocument();
    // notes surfaced in the row
    expect(within(failedRow).getByText(/exit code 2/)).toBeInTheDocument();

    const succeededRow = screen.getByTestId('run-row-run-2');
    expect(within(succeededRow).getByText('succeeded')).toBeInTheDocument();
    expect(within(succeededRow).getByText('scan')).toBeInTheDocument();
  });
});
