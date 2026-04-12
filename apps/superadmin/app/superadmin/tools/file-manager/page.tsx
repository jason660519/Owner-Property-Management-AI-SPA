'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCog, RefreshCw, Eye, Archive, Trash2, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Input } from '@/components/ui/Input';
import type { ApplyResult, PlanResult, RollbackResult, ScanResult } from '@/lib/file-manager/types';

interface ConfigResponse {
  projectRoot: string;
  configPath: string;
  raw: string;
}

interface HistoryResponse {
  plans: Array<{ planId: string; appliedAt: string; backupDir: string }>;
}

interface ScanResponse {
  scan: ScanResult;
  markdown: string;
}

interface PlanResponse {
  scan: ScanResult;
  plan: PlanResult;
  markdown: { scan: string; plan: string };
}

interface ApplyResponse {
  ok: boolean;
  result: ApplyResult;
  warning?: string;
}

interface RollbackResponse {
  ok: boolean;
  result: RollbackResult;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export default function FileManagerPage() {
  const [configRaw, setConfigRaw] = useState<string>('');
  const [configPath, setConfigPath] = useState<string>('');
  const [history, setHistory] = useState<HistoryResponse['plans']>([]);
  const [selectedRollbackPlanId, setSelectedRollbackPlanId] = useState<string>('');
  const [simpleEditorOpen, setSimpleEditorOpen] = useState<boolean>(true);

  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);
  const [rollbackResult, setRollbackResult] = useState<RollbackResponse | null>(null);
  const [planViewerOpen, setPlanViewerOpen] = useState<boolean>(false);
  const [planQuery, setPlanQuery] = useState<string>('');

  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const parsedConfig = useMemo(() => {
    try {
      const json = JSON.parse(configRaw) as unknown;
      return json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [configRaw]);

  const mutateConfig = useCallback(
    (mutator: (cfg: Record<string, unknown>) => void) => {
      try {
        const json = JSON.parse(configRaw) as unknown;
        if (!json || typeof json !== 'object') throw new Error('invalid json');
        const cfg = json as Record<string, unknown>;
        mutator(cfg);
        setConfigRaw(JSON.stringify(cfg, null, 2) + '\n');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [configRaw],
  );

  const readStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];

  const getNestedObject = (obj: Record<string, unknown> | null, key: string): Record<string, unknown> | null => {
    if (!obj) return null;
    const v = obj[key];
    if (!v || typeof v !== 'object') return null;
    return v as Record<string, unknown>;
  };

  const configActions = useMemo(() => getNestedObject(parsedConfig, 'actions'), [parsedConfig]);
  const configScan = useMemo(() => getNestedObject(parsedConfig, 'scan'), [parsedConfig]);
  const configStandards = useMemo(() => getNestedObject(parsedConfig, 'standards'), [parsedConfig]);
  const configAllowedRoot = useMemo(() => getNestedObject(configStandards, 'allowedRoot'), [configStandards]);
  const configRedundancy = useMemo(() => getNestedObject(parsedConfig, 'redundancy'), [parsedConfig]);

  const simpleArchiveRootUnknown = Boolean(configActions?.archiveRootUnknown);
  const simpleArchiveRoot = typeof configActions?.archiveRoot === 'string' ? (configActions.archiveRoot as string) : '';
  const simpleBackupRetentionDays =
    typeof configActions?.backupRetentionDays === 'number' ? String(configActions.backupRetentionDays) : '';
  const simpleSkipDirs = readStringArray(configScan?.skipDirs);
  const simpleAllowedRootFiles = readStringArray(configAllowedRoot?.files);
  const simpleAllowedRootDirs = readStringArray(configAllowedRoot?.dirs);
  const simpleRedundancyEnabled = Boolean(configRedundancy?.enabled);
  const simpleRedundancyAction = typeof configRedundancy?.action === 'string' ? (configRedundancy.action as string) : 'report_only';
  const simpleRedundancyScanDirs = readStringArray(configRedundancy?.scanDirs);
  const simpleRedundancyMinBytes = typeof configRedundancy?.minBytes === 'number' ? String(configRedundancy.minBytes) : '';

  const simpleHasDeleteDsStore = useMemo(() => {
    if (!Array.isArray(configActions?.deleteRules)) return false;
    return (configActions.deleteRules as unknown[]).some((r) => {
      if (!r || typeof r !== 'object') return false;
      const id = (r as { id?: unknown }).id;
      return id === 'ds-store';
    });
  }, [configActions]);

  const loadConfig = useCallback(async () => {
    setError('');
    const data = await fetchJson<ConfigResponse>('/superadmin/api/file-manager/config', {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    });
    setConfigRaw(data.raw);
    setConfigPath(data.configPath);
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await fetchJson<HistoryResponse>('/superadmin/api/file-manager/history', {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    });
    setHistory(data.plans);
    if (!selectedRollbackPlanId && data.plans.length > 0) {
      setSelectedRollbackPlanId(data.plans[0]?.planId ?? '');
    }
  }, [selectedRollbackPlanId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadConfig();
        await loadHistory();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [loadConfig, loadHistory]);

  const canApply = Boolean(plan?.plan && plan.plan.actions.length > 0);
  const canRollback = selectedRollbackPlanId.trim().length > 0;

  const planActions = useMemo(() => {
    if (!plan) return [];
    const out = plan.plan.actions.map((a) => {
      const risk =
        a.type === 'delete'
          ? 'high'
          : a.from.startsWith('apps/') || a.from.startsWith('packages/')
            ? 'medium'
            : 'low';
      return { ...a, risk };
    });
    const rank = (r: string) => (r === 'high' ? 0 : r === 'medium' ? 1 : 2);
    out.sort((a, b) => {
      const ra = rank(a.risk);
      const rb = rank(b.risk);
      if (ra !== rb) return ra - rb;
      return a.from.localeCompare(b.from);
    });
    return out;
  }, [plan]);

  const filteredPlanActions = useMemo(() => {
    if (!plan) return [];
    const q = planQuery.trim().toLowerCase();
    if (!q) return planActions;
    return planActions.filter((a) => {
      const hay = `${a.type} ${a.from} ${a.to ?? ''} ${a.ruleId} ${a.reason}`.toLowerCase();
      return hay.includes(q);
    });
  }, [plan, planActions, planQuery]);

  const planRiskCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const a of planActions) {
      if (a.risk === 'high') counts.high += 1;
      else if (a.risk === 'medium') counts.medium += 1;
      else counts.low += 1;
    }
    return counts;
  }, [planActions]);

  const scanSummary = useMemo(() => {
    if (!scan) return null;
    return scan.scan.summary;
  }, [scan]);

  const planSummary = useMemo(() => {
    if (!plan) return null;
    return {
      actions: plan.plan.actions.length,
      warnings: plan.plan.warnings.length,
      violations: plan.scan.summary.violationsBySeverity,
    };
  }, [plan]);

  const applySummary = useMemo(() => {
    if (!applyResult) return null;
    const applied = applyResult.result.appliedActions.length;
    const skipped = applyResult.result.skippedActions.length;
    const total = applied + skipped;
    return { applied, skipped, total };
  }, [applyResult]);

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="File Manager"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: 'Tools', href: '/superadmin/tools' },
        { label: 'File Manager' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCog size={18} />
              <h1 className="text-2xl font-bold text-text-primary">檔案整理與歸檔系統</h1>
            </div>
            <p className="text-sm text-text-muted mt-1">
              以規則驅動的掃描、整理計畫、歸檔/清理與回滾。預設為保守模式（僅針對暫存檔/OS 雜訊檔做自動化）。
            </p>
          </div>
          <Link href="/superadmin/tools" className="shrink-0">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}>
              返回 Tools
            </Button>
          </Link>
        </div>

        {error && (
          <Card variant="outlined" padding="md">
            <CardHeader>
              <CardTitle className="text-error">錯誤</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>規則配置</CardTitle>
            <CardDescription>
              目前載入：{configPath || '(unknown)'}。可用簡易模式調整常用選項，或直接編輯 JSON 後儲存。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={simpleEditorOpen}
                    onChange={(e) => setSimpleEditorOpen(e.target.checked)}
                  />
                  簡易編輯模式（白話）
                </label>
                <div className="text-xs text-text-muted">
                  簡易模式只涵蓋常用項目；進階細節仍以 JSON 為準（儲存會由伺服器驗證）。
                </div>
              </div>

              {simpleEditorOpen && parsedConfig && (
                <Card variant="outlined" padding="md">
                  <CardHeader>
                    <CardTitle>簡易設定</CardTitle>
                    <CardDescription>用勾選與欄位快速調整「更積極」自動化策略</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            mutateConfig((cfg) => {
                              const actions = getNestedObject(cfg, 'actions') ?? {};
                              actions.archiveRootUnknown = false;
                              actions.archiveRoot = 'backups/file-manager/archive';
                              cfg.actions = actions;

                              const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                              redundancy.enabled = true;
                              redundancy.action = 'report_only';
                              cfg.redundancy = redundancy;
                            });
                          }}
                        >
                          套用：保守
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            mutateConfig((cfg) => {
                              const actions = getNestedObject(cfg, 'actions') ?? {};
                              actions.archiveRootUnknown = true;
                              actions.archiveRoot = 'backups/file-manager/archive';
                              cfg.actions = actions;

                              const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                              redundancy.enabled = true;
                              redundancy.action = 'report_only';
                              cfg.redundancy = redundancy;
                            });
                          }}
                        >
                          套用：積極
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            mutateConfig((cfg) => {
                              const actions = getNestedObject(cfg, 'actions') ?? {};
                              actions.archiveRootUnknown = true;
                              actions.archiveRoot = 'backups/file-manager/archive';
                              cfg.actions = actions;

                              const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                              redundancy.enabled = true;
                              redundancy.action = 'archive_duplicates';
                              cfg.redundancy = redundancy;
                            });
                          }}
                        >
                          套用：激進+去重
                        </Button>
                      </div>

                      <Card variant="outlined" padding="md">
                        <CardHeader>
                          <CardTitle>整理行為</CardTitle>
                          <CardDescription>歸檔/刪除與備份保留</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex items-center gap-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={simpleArchiveRootUnknown}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const actions = getNestedObject(cfg, 'actions') ?? {};
                                    actions.archiveRootUnknown = e.target.checked;
                                    cfg.actions = actions;
                                  })
                                }
                              />
                              根目錄未列入規範（unknown）自動歸檔
                            </label>

                            <label className="flex items-center gap-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={simpleHasDeleteDsStore}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const actions = getNestedObject(cfg, 'actions') ?? {};
                                    const deleteRules = Array.isArray(actions.deleteRules) ? (actions.deleteRules as unknown[]) : [];
                                    const next = deleteRules.filter((r) => {
                                      if (!r || typeof r !== 'object') return true;
                                      return (r as { id?: unknown }).id !== 'ds-store';
                                    });
                                    if (e.target.checked) {
                                      next.unshift({
                                        id: 'ds-store',
                                        description: '刪除 .DS_Store',
                                        match: { glob: '**/.DS_Store' },
                                      });
                                    }
                                    actions.deleteRules = next;
                                    cfg.actions = actions;
                                  })
                                }
                              />
                              自動刪除 .DS_Store
                            </label>

                            <Input
                              label="歸檔根目錄（archiveRoot）"
                              value={simpleArchiveRoot}
                              onChange={(e) =>
                                mutateConfig((cfg) => {
                                  const actions = getNestedObject(cfg, 'actions') ?? {};
                                  actions.archiveRoot = e.target.value;
                                  cfg.actions = actions;
                                })
                              }
                            />

                            <Input
                              label="備份保留天數（backupRetentionDays）"
                              value={simpleBackupRetentionDays}
                              inputMode="numeric"
                              onChange={(e) =>
                                mutateConfig((cfg) => {
                                  const actions = getNestedObject(cfg, 'actions') ?? {};
                                  const n = Number(e.target.value);
                                  actions.backupRetentionDays = Number.isFinite(n) ? n : 30;
                                  cfg.actions = actions;
                                })
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" padding="md">
                        <CardHeader>
                          <CardTitle>重複檔案</CardTitle>
                          <CardDescription>依 SHA-256 偵測，並可自動歸檔重複項</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex items-center gap-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={simpleRedundancyEnabled}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                                    redundancy.enabled = e.target.checked;
                                    cfg.redundancy = redundancy;
                                  })
                                }
                              />
                              啟用重複檔案偵測
                            </label>

                            <label className="flex items-center gap-2 text-sm text-text-primary">
                              <span className="text-sm">處理方式</span>
                              <select
                                value={simpleRedundancyAction}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                                    redundancy.action = e.target.value;
                                    cfg.redundancy = redundancy;
                                  })
                                }
                                className="text-sm bg-bg-secondary text-text-primary border border-border-default rounded-md px-3 py-2"
                              >
                                <option value="report_only">只報告（不動檔）</option>
                                <option value="archive_duplicates">自動歸檔重複檔案</option>
                              </select>
                            </label>

                            <Input
                              label="最小檔案大小（bytes）"
                              value={simpleRedundancyMinBytes}
                              inputMode="numeric"
                              onChange={(e) =>
                                mutateConfig((cfg) => {
                                  const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                                  const n = Number(e.target.value);
                                  redundancy.minBytes = Number.isFinite(n) ? n : 256;
                                  cfg.redundancy = redundancy;
                                })
                              }
                            />

                            <div className="md:col-span-2">
                              <div className="text-sm text-text-primary mb-1">掃描目錄（每行一個）</div>
                              <textarea
                                value={simpleRedundancyScanDirs.join('\n')}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const redundancy = getNestedObject(cfg, 'redundancy') ?? {};
                                    redundancy.scanDirs = e.target.value
                                      .split('\n')
                                      .map((s) => s.trim())
                                      .filter((s) => s.length > 0);
                                    cfg.redundancy = redundancy;
                                  })
                                }
                                className="w-full h-28 font-mono text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" padding="md">
                        <CardHeader>
                          <CardTitle>掃描忽略清單</CardTitle>
                          <CardDescription>每行一個目錄（避免掃描本機環境或大量產物）</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <textarea
                            value={simpleSkipDirs.join('\n')}
                            onChange={(e) =>
                              mutateConfig((cfg) => {
                                const scanObj = getNestedObject(cfg, 'scan') ?? {};
                                scanObj.skipDirs = e.target.value
                                  .split('\n')
                                  .map((s) => s.trim())
                                  .filter((s) => s.length > 0);
                                cfg.scan = scanObj;
                              })
                            }
                            className="w-full h-28 font-mono text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3"
                            spellCheck={false}
                          />
                        </CardContent>
                      </Card>

                      <Card variant="outlined" padding="md">
                        <CardHeader>
                          <CardTitle>根目錄白名單</CardTitle>
                          <CardDescription>哪些檔案/資料夾允許留在 repo root（每行一個）</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="text-sm text-text-primary mb-1">允許的檔案</div>
                              <textarea
                                value={simpleAllowedRootFiles.join('\n')}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const standards = getNestedObject(cfg, 'standards') ?? {};
                                    const allowedRoot = getNestedObject(standards, 'allowedRoot') ?? {};
                                    allowedRoot.files = e.target.value
                                      .split('\n')
                                      .map((s) => s.trim())
                                      .filter((s) => s.length > 0);
                                    standards.allowedRoot = allowedRoot;
                                    cfg.standards = standards;
                                  })
                                }
                                className="w-full h-40 font-mono text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3"
                                spellCheck={false}
                              />
                            </div>
                            <div>
                              <div className="text-sm text-text-primary mb-1">允許的資料夾</div>
                              <textarea
                                value={simpleAllowedRootDirs.join('\n')}
                                onChange={(e) =>
                                  mutateConfig((cfg) => {
                                    const standards = getNestedObject(cfg, 'standards') ?? {};
                                    const allowedRoot = getNestedObject(standards, 'allowedRoot') ?? {};
                                    allowedRoot.dirs = e.target.value
                                      .split('\n')
                                      .map((s) => s.trim())
                                      .filter((s) => s.length > 0);
                                    standards.allowedRoot = allowedRoot;
                                    cfg.standards = standards;
                                  })
                                }
                                className="w-full h-40 font-mono text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              <textarea
                value={configRaw}
                onChange={(e) => setConfigRaw(e.target.value)}
                className="w-full h-72 font-mono text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3"
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw size={14} />}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await loadConfig();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  重新載入
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy || configRaw.trim().length === 0}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await fetchJson('/superadmin/api/file-manager/config', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ raw: configRaw }),
                      });
                      await loadConfig();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  儲存規則
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>掃描與整理</CardTitle>
            <CardDescription>
              掃描會回傳違規清單與重複檔案候選；整理計畫會依規則產生可套用的歸檔/刪除動作（套用前可預覽）。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  setPlan(null);
                  setApplyResult(null);
                  setRollbackResult(null);
                  try {
                    const data = await fetchJson<ScanResponse>('/superadmin/api/file-manager/scan', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                    });
                    setScan(data);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                執行掃描
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  setApplyResult(null);
                  setRollbackResult(null);
                  try {
                    const data = await fetchJson<PlanResponse>('/superadmin/api/file-manager/plan', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                    });
                    setPlan(data);
                    setScan({ scan: data.scan, markdown: data.markdown.scan });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                產生整理計畫
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Eye size={14} />}
                disabled={busy || !plan}
                onClick={() => setPlanViewerOpen(true)}
              >
                觀看計畫
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy || !canApply}
                onClick={async () => {
                  if (!plan) return;
                  setBusy(true);
                  setError('');
                  setRollbackResult(null);
                  try {
                    const data = await fetchJson<ApplyResponse>('/superadmin/api/file-manager/apply', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ plan: plan.plan }),
                    });
                    setApplyResult(data);
                    await loadHistory();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                套用計畫（含備份）
              </Button>
            </div>

            {applyResult && applySummary && (
              <Card variant="outlined" padding="md" className="mt-4">
                <CardHeader>
                  <CardTitle>執行結果（套用計畫）</CardTitle>
                  <CardDescription>
                    planId={applyResult.result.planId}；執行時間：{new Date(applyResult.result.appliedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-text-primary">
                    <div>
                      狀態：
                      {applySummary.skipped > 0 ? (
                        <span className="text-accent font-medium">部分成功</span>
                      ) : (
                        <span className="text-text-primary font-medium">成功</span>
                      )}
                    </div>
                    <div>總動作：{applySummary.total}</div>
                    <div>成功套用：{applySummary.applied}</div>
                    <div>略過：{applySummary.skipped}</div>
                    <div>備份目錄：{applyResult.result.backupDir}</div>
                    <div>備份清單：{applyResult.result.manifestPath}</div>
                    {applyResult.warning ? <div className="text-text-muted">提示：{applyResult.warning}</div> : null}
                  </div>
                  {applyResult.result.skippedActions.length > 0 && (
                    <div className="mt-3 rounded-md border border-border-default bg-bg-secondary p-3">
                      <div className="text-xs font-semibold text-text-primary mb-2">略過原因（前 10 筆）</div>
                      <div className="space-y-1 text-xs text-text-secondary">
                        {applyResult.result.skippedActions.slice(0, 10).map((a) => (
                          <div key={`${a.type}:${a.from}:${a.ruleId}`}>
                            {a.from} - {a.skipReason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Card variant="outlined" padding="md">
                <CardHeader>
                  <CardTitle>掃描摘要</CardTitle>
                  <CardDescription>目前畫面上的 scan 結果</CardDescription>
                </CardHeader>
                <CardContent>
                  {scanSummary ? (
                    <div className="text-sm text-text-primary space-y-1">
                      <div>files: {scanSummary.totalFiles}</div>
                      <div>dirs: {scanSummary.totalDirs}</div>
                      <div>
                        violations: error={scanSummary.violationsBySeverity.error} / warning=
                        {scanSummary.violationsBySeverity.warning} / info={scanSummary.violationsBySeverity.info}
                      </div>
                      <div>duplicateGroups: {scan?.scan.duplicates.length ?? 0}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-text-muted">尚未執行掃描</div>
                  )}
                </CardContent>
              </Card>

              <Card variant="outlined" padding="md">
                <CardHeader>
                  <CardTitle>計畫摘要</CardTitle>
                  <CardDescription>目前畫面上的 plan 結果</CardDescription>
                </CardHeader>
                <CardContent>
                  {planSummary ? (
                    <div className="text-sm text-text-primary space-y-1">
                      <div>actions: {planSummary.actions}</div>
                      <div>warnings: {planSummary.warnings}</div>
                      <div>
                        violations: error={planSummary.violations.error} / warning={planSummary.violations.warning} / info=
                        {planSummary.violations.info}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-text-muted">尚未產生整理計畫</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>回滾</CardTitle>
            <CardDescription>
              回滾會使用 backups/file-manager/&lt;planId&gt;/files 內的備份還原到原路徑。建議只回滾最近一次套用的計畫。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedRollbackPlanId}
                onChange={(e) => setSelectedRollbackPlanId(e.target.value)}
                className="text-sm bg-bg-secondary text-text-primary border border-border-default rounded-md px-3 py-2"
              >
                <option value="">(選擇 planId)</option>
                {history.map((h) => (
                  <option key={h.planId} value={h.planId}>
                    {h.planId} ({new Date(h.appliedAt).toLocaleString()})
                  </option>
                ))}
              </select>
              <Button
                variant="danger"
                size="sm"
                disabled={busy || !canRollback}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const data = await fetchJson<RollbackResponse>('/superadmin/api/file-manager/rollback', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ planId: selectedRollbackPlanId }),
                    });
                    setRollbackResult(data);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                執行回滾
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await loadHistory();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                重新載入歷史
              </Button>
            </div>

            {(applyResult || rollbackResult) && (
              <div className="mt-4 space-y-3">
                {rollbackResult && (
                  <Card variant="outlined" padding="md">
                    <CardHeader>
                      <CardTitle>回滾結果</CardTitle>
                      <CardDescription>
                        planId={rollbackResult.result.planId} restored={rollbackResult.result.restoredCount}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3 overflow-auto">
                        {JSON.stringify(rollbackResult.result, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>報告（Markdown）</CardTitle>
            <CardDescription>可直接複製到 issue 或 PR，或用於追蹤趨勢</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3 overflow-auto h-96">
              {plan?.markdown.plan || scan?.markdown || '尚無報告'}
            </pre>
          </CardContent>
        </Card>

        <Sheet open={planViewerOpen} onOpenChange={setPlanViewerOpen}>
          <SheetContent className="sm:max-w-2xl">
            <SheetHeader>
              <div>
                <SheetTitle>整理計畫細節</SheetTitle>
                <SheetDescription>
                  high={planRiskCounts.high} / medium={planRiskCounts.medium} / low={planRiskCounts.low}（以動作類型與路徑粗分，套用前請逐條確認）
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="p-6 space-y-4">
              {!plan ? (
                <div className="text-sm text-text-muted">尚未產生整理計畫</div>
              ) : (
                <>
                  <Card variant="outlined" padding="md">
                    <CardHeader>
                      <CardTitle>風險與警告</CardTitle>
                      <CardDescription>系統自動標記的高風險訊號</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {plan.plan.warnings.length === 0 ? (
                        <div className="text-sm text-text-muted">無</div>
                      ) : (
                        <div className="space-y-2">
                          {plan.plan.warnings.map((w) => (
                            <div key={w} className="flex items-start gap-2 text-sm text-text-primary">
                              <AlertTriangle size={14} className="mt-0.5 text-accent" />
                              <div>{w}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Input
                    value={planQuery}
                    onChange={(e) => setPlanQuery(e.target.value)}
                    placeholder="搜尋：路徑 / ruleId / reason / to..."
                  />

                  <Card variant="outlined" padding="md">
                    <CardHeader>
                      <CardTitle>動作清單</CardTitle>
                      <CardDescription>
                        顯示 {filteredPlanActions.length} / {plan.plan.actions.length}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {filteredPlanActions.length === 0 ? (
                        <div className="text-sm text-text-muted">無符合條件的動作</div>
                      ) : (
                        <div className="space-y-2">
                          {filteredPlanActions.slice(0, 500).map((a) => (
                            <div
                              key={`${a.type}:${a.from}:${a.to ?? ''}:${a.ruleId}`}
                              className="rounded-md border border-border-default bg-bg-secondary p-3 text-xs text-text-primary"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {a.type === 'delete' ? <Trash2 size={14} /> : <Archive size={14} />}
                                  <span className="font-semibold">{a.type}</span>
                                  <span className="text-text-muted">{a.risk}</span>
                                </div>
                                <div className="text-text-muted">{a.ruleId}</div>
                              </div>
                              <div className="mt-2 break-all">
                                <div>from: {a.from}</div>
                                {a.to ? <div>to: {a.to}</div> : null}
                              </div>
                              <div className="mt-2 text-text-secondary">{a.reason}</div>
                            </div>
                          ))}
                          {filteredPlanActions.length > 500 ? (
                            <div className="text-xs text-text-muted">已截斷（僅顯示前 500 筆）</div>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="outlined" padding="md">
                    <CardHeader>
                      <CardTitle>原始 Plan（Markdown）</CardTitle>
                      <CardDescription>可複製貼到 issue/PR 進行審核</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-bg-secondary text-text-primary border border-border-default rounded-md p-3 overflow-auto max-h-80">
                        {plan.markdown.plan}
                      </pre>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
