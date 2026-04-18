import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DatasetTreePanel from '../DatasetTreePanel';
import { buildDatasetTree } from '@/lib/people-db/dataset-tree';

function renderPanel(
  selected: string[] = [],
  {
    threshold = 500_000,
    loading = false,
  }: { threshold?: number; loading?: boolean } = {},
) {
  const tree = buildDatasetTree([
    { key: '企業名錄/2012/三萬企業', doc_count: 30_000 },
    { key: '企業名錄/2012/工商名錄', doc_count: 170_000 },
    { key: '企業名錄/2013/品牌年鑑', doc_count: 50_000 },
    { key: '台北市里長', doc_count: 456 },
  ]);
  const onChange = jest.fn();
  const utils = render(
    <DatasetTreePanel
      tree={tree}
      selectedPaths={selected}
      onChange={onChange}
      scopeWarnThreshold={threshold}
      loading={loading}
    />,
  );
  return { ...utils, onChange, tree };
}

describe('DatasetTreePanel', () => {
  it('renders roots and first-level children expanded by default', () => {
    renderPanel();
    expect(screen.getByText('企業名錄')).toBeInTheDocument();
    expect(screen.getByText('2012')).toBeInTheDocument();
    expect(screen.getByText('台北市里長')).toBeInTheDocument();
    // Grandchildren are initially collapsed.
    expect(screen.queryByText('三萬企業')).not.toBeInTheDocument();
  });

  it('expands deeper levels when chevron is clicked', () => {
    renderPanel();
    // 2012 and 2013 are collapsed by default (only roots auto-expand).
    // Pick the first collapsed chevron — it's the 2012 row.
    const expandButtons = screen.getAllByRole('button', { name: '展開' });
    fireEvent.click(expandButtons[0]);
    expect(screen.getByText('三萬企業')).toBeInTheDocument();
  });

  it('selects all descendants when parent checkbox is ticked', () => {
    const { onChange } = renderPanel();
    // checkbox for 企業名錄 (root)
    const checkbox = screen.getByLabelText('選取 企業名錄');
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next).toEqual(
      expect.arrayContaining([
        '企業名錄',
        '企業名錄/2012',
        '企業名錄/2012/三萬企業',
        '企業名錄/2012/工商名錄',
        '企業名錄/2013',
        '企業名錄/2013/品牌年鑑',
      ]),
    );
    expect(next).not.toContain('台北市里長');
  });

  it('shows scope warning banner when selection exceeds threshold', () => {
    // threshold 100 + selecting 企業名錄 (250K docs) should trigger warning
    renderPanel(['企業名錄'], { threshold: 100 });
    expect(screen.getByTestId('scope-warning')).toBeInTheDocument();
  });

  it('hides scope warning when selection is within threshold', () => {
    renderPanel(['台北市里長'], { threshold: 1_000_000 });
    expect(screen.queryByTestId('scope-warning')).not.toBeInTheDocument();
  });

  it('renders loading state without tree items', () => {
    render(
      <DatasetTreePanel tree={[]} selectedPaths={[]} onChange={jest.fn()} loading />,
    );
    expect(screen.getByText('載入中…')).toBeInTheDocument();
  });

  it('renders empty state when tree has no nodes', () => {
    render(
      <DatasetTreePanel tree={[]} selectedPaths={[]} onChange={jest.fn()} loading={false} />,
    );
    expect(
      screen.getByText('尚無資料來源。匯入資料後將自動出現於此。'),
    ).toBeInTheDocument();
  });

  it('clears all selections when 清空 is clicked', () => {
    const { onChange } = renderPanel(['企業名錄']);
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
