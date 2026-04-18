import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RelatedPeoplePanel from '../RelatedPeoplePanel';

// Helper to install a fetch stub that returns a JSON body for the next call.
function installFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

const SAMPLE_RESPONSE = {
  seed: {
    record_id: 'seed-1',
    source: { full_name: '王小明', address: '臺北市信義區市府路 1 號' },
  },
  targets: {
    address: '臺北市信義區市府路1號',
    phone: '02-12345678',
    mobile: null,
    company: '統一集團',
  },
  groups: {
    address: [
      {
        record_id: 'rec-2',
        source: {
          full_name: '王大明',
          dataset_path: '里長/2020',
          address: '臺北市信義區市府路 1 號 5F',
        },
        score: 1.42,
      },
    ],
    phone: [
      {
        record_id: 'rec-3',
        source: { full_name: '陳阿姨', dataset_path: '電話簿/2018', phone: '02-12345678' },
        score: 0.91,
      },
    ],
    mobile: [],
    company: [
      {
        record_id: 'rec-4',
        source: {
          full_name: '林經理',
          dataset_path: '商業登記/2022',
          company: '統一集團',
        },
        score: 0.55,
      },
    ],
  },
};

describe('RelatedPeoplePanel', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders nothing while loading and shows results once fetch resolves', async () => {
    installFetchOnce(SAMPLE_RESPONSE);
    render(<RelatedPeoplePanel recordId="seed-1" />);

    expect(screen.getByText('搜尋親友關係中…')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('王大明')).toBeInTheDocument());
    expect(screen.getByText('陳阿姨')).toBeInTheDocument();
    expect(screen.getByText('林經理')).toBeInTheDocument();
    expect(screen.getByText('共 3 筆關聯')).toBeInTheDocument();
  });

  it('builds the request URL from explicit identifiers and clamps size', async () => {
    installFetchOnce({ ...SAMPLE_RESPONSE, groups: { address: [], phone: [], mobile: [], company: [] }, seed: null, targets: { address: null, phone: null, mobile: null, company: null } });
    render(<RelatedPeoplePanel address="臺北市信義區市府路1號" size={9999} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/api/people-db/related?');
    expect(url).toContain('address=');
    // size is clamped to <= 200
    expect(url).toMatch(/size=200/);
  });

  it('does not fetch when no identifiers are supplied', () => {
    render(<RelatedPeoplePanel />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText('搜尋親友關係中…')).not.toBeInTheDocument();
  });

  it('renders the empty state when no related records are found', async () => {
    installFetchOnce({
      seed: null,
      targets: { address: null, phone: null, mobile: null, company: null },
      groups: { address: [], phone: [], mobile: [], company: [] },
    });
    render(<RelatedPeoplePanel recordId="seed-1" />);

    await waitFor(() =>
      expect(
        screen.getByText('尚未找到任何同住址 / 同電話 / 同公司的親友。'),
      ).toBeInTheDocument(),
    );
  });

  it('shows the API error message when the request fails', async () => {
    installFetchOnce({ detail: 'seed record not found' }, { ok: false, status: 404 });
    render(<RelatedPeoplePanel recordId="missing" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('seed record not found');
  });

  it('collapses a group when its header toggle is clicked', async () => {
    installFetchOnce(SAMPLE_RESPONSE);
    render(<RelatedPeoplePanel recordId="seed-1" />);

    await waitFor(() => expect(screen.getByText('王大明')).toBeInTheDocument());

    const toggle = screen.getByTestId('related-group-address-toggle');
    fireEvent.click(toggle);

    await waitFor(() => expect(screen.queryByText('王大明')).not.toBeInTheDocument());
    // Other groups remain expanded.
    expect(screen.getByText('陳阿姨')).toBeInTheDocument();
  });

  it('links each related row to its person detail page', async () => {
    installFetchOnce(SAMPLE_RESPONSE);
    render(<RelatedPeoplePanel recordId="seed-1" />);

    const link = await screen.findByRole('link', { name: '王大明' });
    expect(link).toHaveAttribute(
      'href',
      '/superadmin/settings/people-database/person/rec-2',
    );
  });
});
