// Row 145 Sprint 4b — admin merge-candidates page tests.
// Maps to tdd-spec §4.3 (5 cases). Mocks global.fetch so the component's
// useState + fetch loader pattern can be exercised against deterministic
// API responses.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MergeCandidatesWorkspace } from '../page';

interface Fixture {
  ok: boolean;
  total: number;
  page: number;
  page_size: number;
  items: Array<Record<string, unknown>>;
}

function makeItem(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const id = (overrides.id as string) ?? 'c1';
  return {
    id,
    person_a_id: (overrides.person_a_id as string) ?? `p-${id}`,
    record_b_id: (overrides.record_b_id as string) ?? `s-${id}`,
    match_reason: (overrides.match_reason as string) ?? 'name_phone',
    confidence: (overrides.confidence as number) ?? 0.85,
    status: 'pending',
    person: overrides.person ?? {
      person_id: `p-${id}`,
      canonical_name: '王小明',
      canonical_id_no: null,
      canonical_phones: ['0912345678'],
      canonical_address: '台北市中山區中山北路一段100號',
    },
    staging: overrides.staging ?? {
      id: `s-${id}`,
      normalized: {
        name: '王小明',
        phones: ['0912345678'],
        address: { raw: '新北市板橋區文化路二段' },
      },
    },
  };
}

function fixture(items: Array<Record<string, unknown>>): Fixture {
  return { ok: true, total: items.length, page: 1, page_size: 20, items };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type FetchMock = jest.Mock<Promise<Response>, [string | URL, RequestInit?]>;

function installFetch(): FetchMock {
  const mock = jest.fn() as unknown as FetchMock;
  (global as unknown as { fetch: FetchMock }).fetch = mock;
  return mock;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('MergeCandidatesWorkspace', () => {
  it('renders pending cards with A/B comparison fields, confidence and match_reason', async () => {
    const items = [
      makeItem({
        id: 'c1',
        match_reason: 'name_phone',
        confidence: 0.85,
        person: {
          person_id: 'p1',
          canonical_name: '王小明',
          canonical_phones: ['0912345678'],
          canonical_address: '台北市中山區中山北路一段100號',
        },
        staging: {
          id: 's1',
          normalized: { name: '王小明', phones: ['0912345678'], address: { raw: '新北市板橋區' } },
        },
      }),
      makeItem({
        id: 'c2',
        match_reason: 'name_addr',
        confidence: 0.7,
        person: { person_id: 'p2', canonical_name: '李大華', canonical_phones: [], canonical_address: null },
        staging: { id: 's2', normalized: { name: '李大華', phones: [], address: { raw: '高雄市' } } },
      }),
      makeItem({ id: 'c3' }),
    ];

    const f = installFetch();
    f.mockResolvedValueOnce(jsonResponse(fixture(items)));

    render(<MergeCandidatesWorkspace />);

    // Initial loader resolves → all three cards visible.
    await waitFor(() => expect(screen.getAllByTestId('merge-candidate-card')).toHaveLength(3));

    // Each card must surface confidence + match_reason.
    expect(screen.getAllByTestId('merge-candidate-card')[0]).toHaveTextContent('name_phone');
    expect(screen.getAllByTestId('merge-candidate-card')[0]).toHaveTextContent('0.85');
    expect(screen.getAllByTestId('merge-candidate-card')[1]).toHaveTextContent('name_addr');
    expect(screen.getAllByTestId('merge-candidate-card')[1]).toHaveTextContent('0.7');

    // Left side shows canonical person, right side shows staging normalized data.
    const firstCard = screen.getAllByTestId('merge-candidate-card')[0];
    expect(firstCard).toHaveTextContent('王小明');
    expect(firstCard).toHaveTextContent('0912345678');
    expect(firstCard).toHaveTextContent('台北市中山區');
    expect(firstCard).toHaveTextContent('新北市板橋區');
  });

  it('clicking "確認合併" posts to /confirm, removes the card and shows a success notice', async () => {
    const items = [makeItem({ id: 'c1' }), makeItem({ id: 'c2' })];

    const f = installFetch();
    f.mockResolvedValueOnce(jsonResponse(fixture(items))); // initial load
    f.mockResolvedValueOnce(jsonResponse({ ok: true })); // confirm c1

    render(<MergeCandidatesWorkspace />);
    await waitFor(() => expect(screen.getAllByTestId('merge-candidate-card')).toHaveLength(2));

    const [firstConfirm] = screen.getAllByRole('button', { name: '確認合併' });
    fireEvent.click(firstConfirm);

    await waitFor(() => expect(screen.getAllByTestId('merge-candidate-card')).toHaveLength(1));

    // Verify the POST url.
    const confirmCall = f.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0].includes('/confirm'),
    );
    expect(confirmCall).toBeDefined();
    expect(confirmCall![0]).toContain('/api/people-db/merge-candidates/c1/confirm');
    expect(confirmCall![1]?.method).toBe('POST');

    // Success notice surfaced.
    expect(screen.getByText(/合併成功/)).toBeInTheDocument();
  });

  it('clicking "拒絕" posts to /reject, removes the card and shows a blacklist notice', async () => {
    const items = [makeItem({ id: 'c1' })];

    const f = installFetch();
    f.mockResolvedValueOnce(jsonResponse(fixture(items)));
    f.mockResolvedValueOnce(jsonResponse({ ok: true }));

    render(<MergeCandidatesWorkspace />);
    await waitFor(() => expect(screen.getAllByTestId('merge-candidate-card')).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: '拒絕' }));

    await waitFor(() => expect(screen.queryByTestId('merge-candidate-card')).not.toBeInTheDocument());

    const rejectCall = f.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0].includes('/reject'),
    );
    expect(rejectCall).toBeDefined();
    expect(rejectCall![0]).toContain('/api/people-db/merge-candidates/c1/reject');
    expect(rejectCall![1]?.method).toBe('POST');
    expect(screen.getByText(/已加入 blacklist/)).toBeInTheDocument();
  });

  it('keeps the card and shows an error when the initial list request returns 500', async () => {
    const f = installFetch();
    f.mockResolvedValueOnce(jsonResponse({ ok: false, error: 'boom' }, 500));

    render(<MergeCandidatesWorkspace />);

    await waitFor(() => expect(screen.getByText(/載入失敗/)).toBeInTheDocument());
    expect(screen.queryByTestId('merge-candidate-card')).not.toBeInTheDocument();
  });

  it('shows the empty-state message when there are no pending candidates', async () => {
    const f = installFetch();
    f.mockResolvedValueOnce(jsonResponse(fixture([])));

    render(<MergeCandidatesWorkspace />);

    await waitFor(() =>
      expect(screen.getByText('目前沒有待確認的候選')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('merge-candidate-card')).not.toBeInTheDocument();
  });
});
