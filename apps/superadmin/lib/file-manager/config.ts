import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { getProjectRoot } from '../docs-config';
import type { FileManagerConfig } from './types';

const severitySchema = z.union([z.literal('info'), z.literal('warning'), z.literal('error')]);

const globMatchSchema = z.object({
  glob: z.string().min(1),
});

const namingRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  match: globMatchSchema,
  fileNameRegex: z.string().min(1).optional(),
  pathSegmentRegex: z.string().min(1).optional(),
  excludeSegmentRegex: z.string().min(1).optional(),
  severity: severitySchema,
});

const archiveRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  match: globMatchSchema,
  destinationSubdir: z.string().min(1),
});

const deleteRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  match: globMatchSchema,
});

const configV1Schema = z.object({
  version: z.literal(1),
  scan: z.object({
    skipDirs: z.array(z.string().min(1)),
    maxFileBytesToHash: z.number().int().positive(),
    hashExtensions: z.array(z.string().min(1)),
  }),
  standards: z.object({
    allowedRoot: z.object({
      files: z.array(z.string().min(1)),
      dirs: z.array(z.string().min(1)),
    }),
    namingRules: z.array(namingRuleSchema),
  }),
  actions: z.object({
    archiveRootUnknown: z.boolean(),
    archiveRoot: z.string().min(1),
    archiveRules: z.array(archiveRuleSchema),
    deleteRules: z.array(deleteRuleSchema),
    backupRetentionDays: z.number().int().nonnegative(),
  }),
  redundancy: z.object({
    enabled: z.boolean(),
    scanDirs: z.array(z.string().min(1)),
    minBytes: z.number().int().nonnegative(),
    action: z.union([z.literal('report_only'), z.literal('archive_duplicates')]),
  }),
});

export const fileManagerConfigSchema = configV1Schema;

export interface LoadConfigResult {
  projectRoot: string;
  configPath: string;
  config: FileManagerConfig;
}

export function getDefaultConfigPath(projectRoot: string): string {
  return path.resolve(projectRoot, 'apps/superadmin/config/file-manager.rules.json');
}

export function loadFileManagerConfig(
  input?: { projectRoot?: string; configPath?: string }
): LoadConfigResult {
  const projectRoot = input?.projectRoot ? path.resolve(input.projectRoot) : getProjectRoot();
  const configPath = input?.configPath
    ? path.resolve(projectRoot, input.configPath)
    : getDefaultConfigPath(projectRoot);

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsedJson = JSON.parse(raw) as unknown;
  const config = fileManagerConfigSchema.parse(parsedJson) as FileManagerConfig;
  return { projectRoot, configPath, config };
}

export function saveFileManagerConfig(
  input: { projectRoot?: string; configPath?: string; config: unknown }
): LoadConfigResult {
  const projectRoot = input.projectRoot ? path.resolve(input.projectRoot) : getProjectRoot();
  const configPath = input.configPath
    ? path.resolve(projectRoot, input.configPath)
    : getDefaultConfigPath(projectRoot);

  const config = fileManagerConfigSchema.parse(input.config) as FileManagerConfig;
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return { projectRoot, configPath, config };
}

export function safeParseConfig(config: unknown): { ok: true; config: FileManagerConfig } | { ok: false; error: string } {
  const parsed = fileManagerConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.toString() };
  }
  return { ok: true, config: parsed.data as FileManagerConfig };
}
