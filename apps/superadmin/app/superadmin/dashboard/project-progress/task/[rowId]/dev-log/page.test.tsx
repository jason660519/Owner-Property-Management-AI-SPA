import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskDevLogPage from './page';

let mockRowId = '001';
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ rowId: mockRowId }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/hooks/useTablePreferences', () => ({
  useTablePreferences: () => ({
    settings: { customRows: [] },
  }),
}));

jest.mock('@/app/data/roadmap', () => ({
  ROADMAP_DATA: {
    features: [
      {
        name: 'Feature 1',
        category: '測試分類',
        percentage: 10,
      },
      {
        name: 'Feature 2',
        category: '測試分類',
        percentage: 20,
        devLogDocPath: '/project-process/dev-logs/not-markdown.txt',
      },
      {
        name: 'Feature 3',
        category: '測試分類',
        percentage: 30,
        devLogDocPath: '/project-process/dev-logs/feature-3-dev-log-2026-04-17.md',
      },
    ],
  },
}));

jest.mock('@/components/docs/MarkdownViewer', () => ({
  MarkdownViewer: ({ content }: { content: string }) => (
    <div data-testid="markdown-viewer">{content}</div>
  ),
}));

describe('TaskDevLogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows fallback warning and empty state when devLogDocPath is missing', async () => {
    mockRowId = '001';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'File not found',
        path: 'project-process/dev-logs/001-development-log-summary.md',
      }),
    }) as jest.Mock;

    render(<TaskDevLogPage />);

    expect(await screen.findByText('尚未設定 `devLogDocPath`')).toBeInTheDocument();
    expect(await screen.findByText('尚未建立這個任務的開發日誌 md')).toBeInTheDocument();
  });

  it('shows invalid-path warning when devLogDocPath is present but invalid', async () => {
    mockRowId = '002';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'File not found',
        path: 'project-process/dev-logs/002-development-log-summary.md',
      }),
    }) as jest.Mock;

    render(<TaskDevLogPage />);

    expect(await screen.findByText('`devLogDocPath` 設定格式無效')).toBeInTheDocument();
    expect(await screen.findByText(/not-markdown\.txt/)).toBeInTheDocument();
  });

  it('renders markdown content when the dev log exists', async () => {
    mockRowId = '003';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: '# Feature 3 Log\n\n- completed task',
        path: 'project-process/dev-logs/feature-3-dev-log-2026-04-17.md',
        name: 'feature-3-dev-log-2026-04-17.md',
        lastModified: '2026-04-17T00:00:00.000Z',
        size: 120,
      }),
    }) as jest.Mock;

    render(<TaskDevLogPage />);

    const viewer = await screen.findByTestId('markdown-viewer');
    expect(viewer).toHaveTextContent('Feature 3 Log');
    expect(viewer).toHaveTextContent('completed task');
  });
});
