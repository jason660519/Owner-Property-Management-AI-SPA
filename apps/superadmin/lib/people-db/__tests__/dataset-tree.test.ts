import {
  buildDatasetTree,
  flattenSelectedPaths,
  totalCountForPaths,
  type DatasetBucket,
} from '../dataset-tree';

describe('buildDatasetTree', () => {
  it('flattens single-segment keys into top-level nodes', () => {
    const buckets: DatasetBucket[] = [
      { key: '台北市里長', doc_count: 456 },
      { key: '企業名錄', doc_count: 200000 },
    ];
    const tree = buildDatasetTree(buckets);

    expect(tree).toHaveLength(2);
    const labels = tree.map((n) => n.label);
    expect(labels).toContain('台北市里長');
    expect(labels).toContain('企業名錄');
    for (const node of tree) {
      expect(node.children).toHaveLength(0);
    }
  });

  it('nests subpaths and rolls up counts to ancestors', () => {
    const buckets: DatasetBucket[] = [
      { key: '企業名錄/2012/三萬企業', doc_count: 30000 },
      { key: '企業名錄/2012/工商名錄', doc_count: 170000 },
      { key: '企業名錄/2013/品牌年鑑', doc_count: 50000 },
    ];
    const tree = buildDatasetTree(buckets);

    expect(tree).toHaveLength(1);
    const root = tree[0];
    expect(root.label).toBe('企業名錄');
    expect(root.count).toBe(30000 + 170000 + 50000);

    const y2012 = root.children.find((c) => c.label === '2012');
    const y2013 = root.children.find((c) => c.label === '2013');
    expect(y2012).toBeDefined();
    expect(y2013).toBeDefined();
    expect(y2012!.count).toBe(30000 + 170000);
    expect(y2013!.count).toBe(50000);
    expect(y2012!.children).toHaveLength(2);
    expect(y2013!.children).toHaveLength(1);
  });

  it('returns metadata fields with sensible defaults', () => {
    const buckets: DatasetBucket[] = [
      { key: '台北市里長', doc_count: 1, last_imported_at: '2026-04-10T00:00:00Z', quality_avg: 0.92 },
    ];
    const tree = buildDatasetTree(buckets);

    expect(tree[0].lastImportedAt).toBe('2026-04-10T00:00:00Z');
    expect(tree[0].qualityAvg).toBeCloseTo(0.92);
    expect(tree[0].favorited).toBe(false);
    expect(tree[0].enabled).toBe(true);
  });

  it('applies metadata overrides (displayName, favorited, enabled)', () => {
    const buckets: DatasetBucket[] = [{ key: '台北市里長', doc_count: 1 }];
    const tree = buildDatasetTree(buckets, {
      台北市里長: { displayName: '里長名冊', favorited: true, enabled: false },
    });

    expect(tree[0].label).toBe('里長名冊');
    expect(tree[0].favorited).toBe(true);
    expect(tree[0].enabled).toBe(false);
  });

  it('sorts favorited nodes first, then by count desc', () => {
    const buckets: DatasetBucket[] = [
      { key: '企業名錄', doc_count: 200000 },
      { key: '台北市里長', doc_count: 456 },
      { key: '謄本資料', doc_count: 180000 },
    ];
    const tree = buildDatasetTree(buckets, {
      台北市里長: { favorited: true },
    });

    expect(tree[0].label).toBe('台北市里長');
    expect(tree[1].label).toBe('企業名錄');
    expect(tree[2].label).toBe('謄本資料');
  });

  it('picks the latest last_imported_at across siblings when rolling up', () => {
    const buckets: DatasetBucket[] = [
      { key: '企業名錄/2012', doc_count: 1, last_imported_at: '2026-01-01T00:00:00Z' },
      { key: '企業名錄/2013', doc_count: 1, last_imported_at: '2026-04-01T00:00:00Z' },
    ];
    const tree = buildDatasetTree(buckets);
    expect(tree[0].lastImportedAt).toBe('2026-04-01T00:00:00Z');
  });

  it('tolerates empty and whitespace keys without throwing', () => {
    const buckets: DatasetBucket[] = [
      { key: '', doc_count: 5 },
      { key: '   ', doc_count: 5 },
      { key: '台北市里長', doc_count: 10 },
    ];
    const tree = buildDatasetTree(buckets);
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe('台北市里長');
  });
});

describe('flattenSelectedPaths', () => {
  const buckets: DatasetBucket[] = [
    { key: '企業名錄/2012/三萬企業', doc_count: 30000 },
    { key: '企業名錄/2012/工商名錄', doc_count: 170000 },
    { key: '企業名錄/2013/品牌年鑑', doc_count: 50000 },
  ];

  it('expands a selected parent to include all descendants', () => {
    const tree = buildDatasetTree(buckets);
    const paths = flattenSelectedPaths(['企業名錄/2012'], tree);
    expect(paths).toEqual(
      expect.arrayContaining([
        '企業名錄/2012',
        '企業名錄/2012/三萬企業',
        '企業名錄/2012/工商名錄',
      ]),
    );
    expect(paths).not.toContain('企業名錄/2013');
  });

  it('returns only the selected leaf when no parent is selected', () => {
    const tree = buildDatasetTree(buckets);
    const paths = flattenSelectedPaths(['企業名錄/2013/品牌年鑑'], tree);
    expect(paths).toEqual(['企業名錄/2013/品牌年鑑']);
  });
});

describe('totalCountForPaths', () => {
  it('sums descendant counts exactly once even when parent and child are selected', () => {
    const buckets: DatasetBucket[] = [
      { key: '企業名錄/2012/三萬企業', doc_count: 30000 },
      { key: '企業名錄/2012/工商名錄', doc_count: 170000 },
    ];
    const tree = buildDatasetTree(buckets);
    // Even when both parent and its own child are in the selection set, we must
    // count the parent's subtree only once to avoid double-counting.
    const total = totalCountForPaths(['企業名錄/2012', '企業名錄/2012/三萬企業'], tree);
    expect(total).toBe(30000 + 170000);
  });

  it('returns 0 for unknown paths', () => {
    const tree = buildDatasetTree([{ key: '台北市里長', doc_count: 1 }]);
    expect(totalCountForPaths(['不存在'], tree)).toBe(0);
  });
});
