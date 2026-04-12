import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ElasticsearchDashboard from '../page';

const mockFetch = jest.fn();
global.fetch = mockFetch;
global.confirm = jest.fn(() => true);

const healthPayload = {
  status: 'green',
  number_of_nodes: 1,
  active_primary_shards: 5,
  active_shards: 5,
};

const statsPayload = {
  index_name: 'property_documents',
  doc_count: 1234,
  store_size_in_bytes: 1048576,
};

const searchPayload = {
  results: [
    {
      document_id: 'doc-1',
      owner_name: '王小明',
      property_address: '台北市信義區',
      score: 0.95,
      highlight: {
        owner_name: ['<em>王小明</em>'],
        property_address: ['台北市<em>信義區</em>'],
      },
    },
  ],
};

function mockOkResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('action=health')) return mockOkResponse(healthPayload);
    if (url.includes('action=stats')) return mockOkResponse(statsPayload);
    if (url.includes('action=search')) return mockOkResponse(searchPayload);
    if (url.includes('action=reindex')) return mockOkResponse({ message: 'ok' });
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ElasticsearchDashboard', () => {
  it('renders page heading', () => {
    render(<ElasticsearchDashboard />);
    expect(screen.getByText('Elasticsearch 管理中心')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ElasticsearchDashboard />);
    expect(screen.getAllByText('載入中...').length).toBeGreaterThan(0);
  });

  it('displays cluster health status after data loads', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => {
      expect(screen.getByText('GREEN')).toBeInTheDocument();
    });
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays index stats after data loads', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  it('triggers reindex and shows message', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => screen.getByText('重建索引'));

    fireEvent.click(screen.getByText('重建索引'));

    await waitFor(() => {
      expect(screen.getByText('已觸發重建索引排程')).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('action=reindex'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('performs a search and renders results without HTML injection', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => screen.getByPlaceholderText(/輸入屋主姓名/));

    fireEvent.change(screen.getByPlaceholderText(/輸入屋主姓名/), {
      target: { value: '王小明' },
    });
    fireEvent.click(screen.getByText('搜尋'));

    await waitFor(() => {
      // HTML tags stripped — plain text only
      expect(screen.getByText('王小明')).toBeInTheDocument();
    });
    // Ensure raw HTML tags are not in the DOM
    expect(document.body.innerHTML).not.toContain('<em>');
    expect(screen.getByText(/0\.95/)).toBeInTheDocument();
  });

  it('shows empty-result message when search returns nothing', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('action=health')) return mockOkResponse(healthPayload);
      if (url.includes('action=stats')) return mockOkResponse(statsPayload);
      if (url.includes('action=search')) return mockOkResponse({ results: [] });
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response);
    });

    render(<ElasticsearchDashboard />);
    await waitFor(() => screen.getByPlaceholderText(/輸入屋主姓名/));

    fireEvent.change(screen.getByPlaceholderText(/輸入屋主姓名/), {
      target: { value: '不存在的屋主' },
    });
    fireEvent.click(screen.getByText('搜尋'));

    await waitFor(() => {
      expect(screen.getByText('找不到符合的結果')).toBeInTheDocument();
    });
  });

  it('shows offline message when ES cluster is unreachable', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('action=health'))
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response);
      if (url.includes('action=stats'))
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response);
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response);
    });

    render(<ElasticsearchDashboard />);
    await waitFor(() => {
      expect(screen.getByText('無法連線至 Elasticsearch')).toBeInTheDocument();
    });
  });

  it('refreshes data when the refresh button is clicked', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => screen.getByText('重新整理'));

    fireEvent.click(screen.getByText('重新整理'));

    // fetchData is called once on mount and once on refresh
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4); // 2 initial + 2 refresh
    });
  });

  it('polls data every 30 seconds', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    jest.advanceTimersByTime(30000);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
  });

  it('searches on Enter key press', async () => {
    render(<ElasticsearchDashboard />);
    await waitFor(() => screen.getByPlaceholderText(/輸入屋主姓名/));

    const input = screen.getByPlaceholderText(/輸入屋主姓名/);
    fireEvent.change(input, { target: { value: '王小明' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('action=search'));
    });
  });
});
