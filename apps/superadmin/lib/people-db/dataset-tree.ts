// Pure helpers for building a hierarchical dataset tree from flat ES buckets.
// Row 144 — People DB dataset tree panel.
//
// Backwards compatibility: legacy documents use flat `data_source` strings
// (e.g. "企業名錄樣本-1776015535230"). New documents will carry `dataset_path`
// like "企業名錄/2012/三萬企業". This helper accepts both and treats a `/`
// separator as hierarchy.

export interface DatasetBucket {
  key: string;
  doc_count: number;
  last_imported_at?: string | null;
  quality_avg?: number | null;
}

export interface DatasetTreeNode {
  key: string;
  label: string;
  path: string;
  count: number;
  children: DatasetTreeNode[];
  lastImportedAt: string | null;
  qualityAvg: number | null;
  favorited: boolean;
  enabled: boolean;
}

export interface DatasetMetadataOverride {
  displayName?: string;
  favorited?: boolean;
  enabled?: boolean;
}

const PATH_SEPARATOR = '/';

function emptyNode(key: string, label: string, path: string): DatasetTreeNode {
  return {
    key,
    label,
    path,
    count: 0,
    children: [],
    lastImportedAt: null,
    qualityAvg: null,
    favorited: false,
    enabled: true,
  };
}

function applyOverride(node: DatasetTreeNode, override?: DatasetMetadataOverride) {
  if (!override) return;
  if (override.displayName) node.label = override.displayName;
  if (typeof override.favorited === 'boolean') node.favorited = override.favorited;
  if (typeof override.enabled === 'boolean') node.enabled = override.enabled;
}

function pickLaterDate(a: string | null, b: string | null | undefined): string | null {
  if (!b) return a;
  if (!a) return b;
  return new Date(b).getTime() > new Date(a).getTime() ? b : a;
}

function mergeQuality(
  parentAvg: number | null,
  parentCount: number,
  childAvg: number | null | undefined,
  childCount: number,
): number | null {
  if (childAvg === null || childAvg === undefined) return parentAvg;
  if (parentAvg === null) return childAvg;
  const total = parentCount + childCount;
  if (total === 0) return parentAvg;
  return (parentAvg * parentCount + childAvg * childCount) / total;
}

function sortNodes(nodes: DatasetTreeNode[]): DatasetTreeNode[] {
  nodes.sort((a, b) => {
    if (a.favorited !== b.favorited) return a.favorited ? -1 : 1;
    if (a.count !== b.count) return b.count - a.count;
    return a.label.localeCompare(b.label, 'zh-Hant');
  });
  for (const n of nodes) sortNodes(n.children);
  return nodes;
}

function findOrCreateChild(
  siblings: DatasetTreeNode[],
  label: string,
  fullPath: string,
  metadata: Record<string, DatasetMetadataOverride>,
): DatasetTreeNode {
  const existing = siblings.find((n) => n.label === label);
  if (existing) return existing;
  const next = emptyNode(fullPath, label, fullPath);
  applyOverride(next, metadata[fullPath]);
  siblings.push(next);
  return next;
}

export function buildDatasetTree(
  buckets: DatasetBucket[],
  metadata: Record<string, DatasetMetadataOverride> = {},
): DatasetTreeNode[] {
  const roots: DatasetTreeNode[] = [];

  for (const bucket of buckets) {
    const rawKey = (bucket.key ?? '').trim();
    if (!rawKey) continue;

    const segments = rawKey.split(PATH_SEPARATOR).map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) continue;

    let siblings = roots;
    let accumulatedPath = '';

    for (const segment of segments) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}${PATH_SEPARATOR}${segment}` : segment;
      const node = findOrCreateChild(siblings, segment, accumulatedPath, metadata);

      // Roll-up stats: every ancestor node gets the bucket's contribution.
      node.qualityAvg = mergeQuality(
        node.qualityAvg,
        node.count,
        bucket.quality_avg ?? null,
        bucket.doc_count,
      );
      node.count += bucket.doc_count;
      node.lastImportedAt = pickLaterDate(node.lastImportedAt, bucket.last_imported_at ?? null);

      siblings = node.children;
    }
  }

  return sortNodes(roots);
}

export function flattenSelectedPaths(
  selected: string[],
  tree: DatasetTreeNode[],
): string[] {
  // For every selected path, include all descendant paths in the tree so the
  // caller can emit terms filters or prefix filters as appropriate.
  const selectedSet = new Set(selected);
  const result = new Set<string>();

  const walk = (node: DatasetTreeNode, ancestorSelected: boolean) => {
    const isSelected = ancestorSelected || selectedSet.has(node.path);
    if (isSelected) result.add(node.path);
    for (const child of node.children) walk(child, isSelected);
  };

  for (const root of tree) walk(root, false);
  return Array.from(result);
}

export function totalCountForPaths(
  paths: string[],
  tree: DatasetTreeNode[],
): number {
  const targets = new Set(paths);
  let total = 0;

  const walk = (node: DatasetTreeNode, counted: boolean): void => {
    if (counted) {
      // Leaf nodes contribute their own count; internal nodes already aggregate
      // descendants, so only count when we first enter a selected subtree.
      return;
    }
    if (targets.has(node.path)) {
      total += node.count;
      for (const child of node.children) walk(child, true);
      return;
    }
    for (const child of node.children) walk(child, false);
  };

  for (const root of tree) walk(root, false);
  return total;
}
