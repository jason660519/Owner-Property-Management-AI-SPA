// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/types.ts
// Shared types and constants for project progress settings (no 'use server')

export const PROJECT_PROGRESS_PAGE_KEY = 'project_progress';

export interface ColumnAlignmentPayload {
  h: 'left' | 'center' | 'right';
  v: 'top' | 'middle' | 'bottom';
}

export interface WidthPresetPayload {
  id: string;
  name: string;
  widths: number[];
}

export interface CustomProjectProgressRowPayload {
  rowId: string;
  name: string;
  category: string;
  locatedPage?: string;
  percentage?: number;
  featureSpecDocPath?: string;
  tddSpecDocPath?: string;
  docPath?: string;
  testCoverage?: number;
  e2eTestCoverage?: number;
}

export interface ProjectProgressSettingsPayload {
  colWidths?: number[];
  headerHeight?: number;
  columnAlignments?: ColumnAlignmentPayload[];
  freezeRowCount?: 0 | 1;
  frozenDataColCount?: number;
  widthPresets?: WidthPresetPayload[];
  activePhase?: 'development' | 'testing' | 'deployment' | 'operations';
  customRows?: CustomProjectProgressRowPayload[];
  hiddenRowKeys?: string[];
}
