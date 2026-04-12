export type Severity = 'info' | 'warning' | 'error';

export interface GlobMatch {
  glob: string;
}

export interface NamingRule {
  id: string;
  description: string;
  match: GlobMatch;
  fileNameRegex?: string;
  pathSegmentRegex?: string;
  excludeSegmentRegex?: string;
  severity: Severity;
}

export interface ArchiveRule {
  id: string;
  description: string;
  match: GlobMatch;
  destinationSubdir: string;
}

export interface DeleteRule {
  id: string;
  description: string;
  match: GlobMatch;
}

export interface FileManagerConfigV1 {
  version: 1;
  scan: {
    skipDirs: string[];
    maxFileBytesToHash: number;
    hashExtensions: string[];
  };
  standards: {
    allowedRoot: {
      files: string[];
      dirs: string[];
    };
    namingRules: NamingRule[];
  };
  actions: {
    archiveRootUnknown: boolean;
    archiveRoot: string;
    archiveRules: ArchiveRule[];
    deleteRules: DeleteRule[];
    backupRetentionDays: number;
  };
  redundancy: {
    enabled: boolean;
    scanDirs: string[];
    minBytes: number;
    action: 'report_only' | 'archive_duplicates';
  };
}

export type FileManagerConfig = FileManagerConfigV1;

export interface FileStatLite {
  size: number;
  mtimeMs: number;
  isFile: boolean;
  isDirectory: boolean;
}

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  stat: FileStatLite;
  ext: string;
  baseName: string;
  parentDir: string;
  depth: number;
}

export interface ScannedDir {
  relativePath: string;
  absolutePath: string;
  stat: FileStatLite;
  baseName: string;
  parentDir: string;
  depth: number;
}

export interface Violation {
  id: string;
  severity: Severity;
  message: string;
  relativePath: string;
  ruleId?: string;
}

export type PlanActionType = 'archive' | 'move' | 'delete';

export interface PlanAction {
  type: PlanActionType;
  from: string;
  to?: string;
  ruleId: string;
  reason: string;
  bytes?: number;
}

export interface ScanSummary {
  totalFiles: number;
  totalDirs: number;
  totalBytes: number;
  violationsBySeverity: Record<Severity, number>;
  violationsByRule: Record<string, number>;
  topDirsByCount: Array<{ dir: string; count: number }>;
}

export interface DuplicateGroup {
  contentHash: string;
  bytes: number;
  files: Array<{ relativePath: string; mtimeMs: number }>;
}

export interface ScanResult {
  scannedAt: string;
  projectRoot: string;
  configPath: string;
  files: ScannedFile[];
  dirs: ScannedDir[];
  violations: Violation[];
  duplicates: DuplicateGroup[];
  summary: ScanSummary;
}

export interface PlanResult {
  planId: string;
  createdAt: string;
  projectRoot: string;
  configPath: string;
  scan: Pick<ScanResult, 'scannedAt' | 'summary'>;
  actions: PlanAction[];
  warnings: string[];
}

export interface ApplyResult {
  planId: string;
  appliedAt: string;
  projectRoot: string;
  backupDir: string;
  manifestPath: string;
  appliedActions: PlanAction[];
  skippedActions: Array<PlanAction & { skipReason: string }>;
}

export interface RollbackResult {
  planId: string;
  rolledBackAt: string;
  projectRoot: string;
  backupDir: string;
  restoredCount: number;
  errors: string[];
}
