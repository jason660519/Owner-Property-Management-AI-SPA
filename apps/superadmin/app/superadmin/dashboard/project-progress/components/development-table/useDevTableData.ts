// filepath: project-progress/components/development-table/useDevTableData.ts
// Hook that merges roadmap features with custom rows and applies filters

import { useMemo } from 'react';
import type { RoadmapFeature } from '@/app/data/roadmap';
import type { CustomProjectProgressRowPayload } from '../../types';
import {
  type ProgressRow,
  normalizeRowIdInput,
  getRowKey,
} from './types';

interface DevTableDataFilters {
  searchQuery: string;
  categoryFilterSingle: string;
  selectedCategories: Set<string>;
  hiddenRowKeysSet: Set<string>;
  showHiddenRows: boolean;
}

interface DevTableDataResult {
  /** All rows (roadmap + custom), unfiltered */
  rows: ProgressRow[];
  /** Rows after applying all filters */
  filteredRows: ProgressRow[];
  /** Unique sorted category names */
  categoryList: string[];
  /** Hidden rows for the View dropdown UI */
  hiddenRowsList: { key: string; row: ProgressRow | undefined }[];
  /** Set of all existing row IDs (for duplicate detection in AddRowModal) */
  existingRowIds: Set<string>;
}

export function useDevTableData(
  features: RoadmapFeature[],
  customRows: CustomProjectProgressRowPayload[],
  hiddenRowKeys: string[],
  filters: DevTableDataFilters,
): DevTableDataResult {
  const rows = useMemo<ProgressRow[]>(() => {
    const base: ProgressRow[] = features.map((f, idx) => ({
      ...f,
      __rowId: (idx + 1).toString().padStart(3, '0'),
      __source: 'roadmap' as const,
    }));

    const custom = customRows.reduce<ProgressRow[]>((acc, r) => {
      const id = normalizeRowIdInput(r.rowId);
      if (!id) return acc;
      const name = r.name.trim();
      const category = r.category.trim();
      if (!name || !category) return acc;
      acc.push({
        name,
        category,
        locatedPage: r.locatedPage?.trim() || undefined,
        percentage: typeof r.percentage === 'number' ? r.percentage : 0,
        featureSpecDocPath: r.featureSpecDocPath?.trim() || undefined,
        tddSpecDocPath: r.tddSpecDocPath?.trim() || undefined,
        docPath: r.docPath?.trim() || undefined,
        testCoverage: typeof r.testCoverage === 'number' ? r.testCoverage : undefined,
        e2eTestCoverage: typeof r.e2eTestCoverage === 'number' ? r.e2eTestCoverage : undefined,
        __rowId: id,
        __source: 'custom' as const,
      });
      return acc;
    }, []);

    return [...base, ...custom];
  }, [features, customRows]);

  const filteredRows = useMemo(() => {
    const q = filters.searchQuery.toLowerCase();
    return rows.filter(r => {
      const rowKey = getRowKey(r.__source, r.__rowId);
      const isHidden = filters.hiddenRowKeysSet.has(rowKey);
      if (isHidden && !filters.showHiddenRows) return false;
      const matchesSearch = r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.locatedPage ?? '').toLowerCase().includes(q);
      const matchesCategoryDropdown = !filters.categoryFilterSingle || r.category === filters.categoryFilterSingle;
      const matchesCategory = filters.selectedCategories.size === 0 || filters.selectedCategories.has(r.category);
      return matchesSearch && matchesCategoryDropdown && matchesCategory;
    });
  }, [rows, filters]);

  const categoryList = useMemo(
    () => Array.from(new Set(rows.map(r => r.category))).sort(),
    [rows],
  );

  const hiddenRowsList = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    rows.forEach(r => map.set(getRowKey(r.__source, r.__rowId), r));
    return hiddenRowKeys.map(key => ({ key, row: map.get(key) }));
  }, [rows, hiddenRowKeys]);

  const existingRowIds = useMemo(
    () => new Set(rows.map(r => r.__rowId)),
    [rows],
  );

  return { rows, filteredRows, categoryList, hiddenRowsList, existingRowIds };
}
