'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import DatasetBadge from '@/components/people-database/DatasetBadge';

// ---------------------------------------------------------------------------
// Types — mirror the shape returned by
//   GET /api/people-db/merge-candidates?embed=person,staging
// ---------------------------------------------------------------------------

interface EmbeddedPerson {
  person_id: string;
  canonical_name: string | null;
  canonical_id_no: string | null;
  canonical_phones: string[] | null;
  canonical_address: string | null;
  source_count?: number | null;
  quality_score?: number | null;
}

interface EmbeddedStaging {
  id: string;
  file_id?: string | null;
  record_index?: number | null;
  normalized?: {
    name?: string | null;
    id_no?: string | null;
    phones?: string[] | null;
    address?: { raw?: string | null; county?: string | null; district?: string | null } | null;
    birth_year?: number | null;
  } | null;
  created_at?: string | null;
}

// Row 146 Step 5: file embed surfaces dataset_root / subpath so the card
// can render a DatasetBadge tracing the candidate back to its source.
interface EmbeddedFile {
  id: string;
  dataset_root: string | null;
  dataset_subpath: string | null;
}

interface Candidate {
  id: string;
  person_a_id: string;
  record_b_id: string;
  match_reason: 'name_phone' | 'name_addr';
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
  decided_by?: string | null;
  decided_at?: string | null;
  created_at?: string;
  person?: EmbeddedPerson | null;
  staging?: EmbeddedStaging | null;
  file?: EmbeddedFile | null;
}

interface ListResponse {
  ok: boolean;
  total: number;
  page: number;
  page_size: number;
  items: Candidate[];
}

type Notice = { type: 'success' | 'error'; text: string };

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Workspace — split from the default export so tests can mount the inner
// component without paying the cost of DashboardLayout's chrome.
// ---------------------------------------------------------------------------

export function MergeCandidatesWorkspace() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setListError(null);
    try {
      // Row 146 Step 5: include file embed for dataset color badges.
      const url =
        `/api/people-db/merge-candidates?status=pending` +
        `&embed=person,staging,file&page=${nextPage}&page_size=${PAGE_SIZE}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as ListResponse;
      setItems(body.items ?? []);
      setTotal(body.total ?? 0);
      setPage(nextPage);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function decide(kind: 'confirm' | 'reject', candidate: Candidate) {
    setBusyId(candidate.id);
    try {
      const res = await fetch(
        `/api/people-db/merge-candidates/${encodeURIComponent(candidate.id)}/${kind}`,
        { method: 'POST' },
      );
      if (res.status === 409) {
        setNotice({ type: 'error', text: '此候選已被處理，重新載入列表' });
        await load(page);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Optimistic removal — the backend confirmed the decision stuck.
      setItems((prev) => prev.filter((it) => it.id !== candidate.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setNotice({
        type: 'success',
        text: kind === 'confirm' ? '合併成功' : '已加入 blacklist',
      });
    } catch {
      setNotice({ type: 'error', text: '操作失敗，請重試' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header + pending-count badge */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">待確認的合併候選</h1>
          <p className="text-text-secondary mt-1">
            ER 無法自動判斷的姓名+電話 / 姓名+地址配對，需要由管理員決定是否合併。
          </p>
        </div>
        <Badge variant="info">待處理 {total}</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(page)}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {/* Notice banner (success/error after action) */}
      {notice && (
        <div
          role="status"
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.type === 'success'
              ? 'border-border-default bg-bg-secondary text-text-primary'
              : 'border-border-default bg-bg-secondary text-text-primary'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Loading / error / empty / list */}
      {loading ? (
        <div className="flex items-center gap-2 text-text-secondary">
          <RefreshCw className="h-4 w-4 animate-spin" />
          載入中…
        </div>
      ) : listError ? (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            <p>載入失敗：{listError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>
              重試
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            目前沒有待確認的候選
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              disabled={busyId === c.id}
              onConfirm={() => decide('confirm', c)}
              onReject={() => decide('reject', c)}
            />
          ))}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => load(page - 1)}
              >
                上一頁
              </Button>
              <span className="text-sm text-text-secondary">
                第 {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))} 頁
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * PAGE_SIZE >= total || loading}
                onClick={() => load(page + 1)}
              >
                下一頁
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card subcomponent
// ---------------------------------------------------------------------------

function CandidateCard({
  candidate,
  disabled,
  onConfirm,
  onReject,
}: {
  candidate: Candidate;
  disabled: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { person, staging, file, match_reason, confidence } = candidate;
  const stagingName = staging?.normalized?.name ?? '—';
  const stagingPhones = staging?.normalized?.phones ?? [];
  const stagingAddress = staging?.normalized?.address?.raw ?? '—';
  // Compose dataset path for the badge: prefer subpath when present so two
  // batches under the same root still show as the same color (root drives
  // the hash) but the chip label conveys the full path. Falls back to root
  // alone, then null (renders neutral grey).
  const datasetPath = file?.dataset_root
    ? file.dataset_subpath
      ? `${file.dataset_root}/${file.dataset_subpath}`
      : file.dataset_root
    : null;

  // Card does not forward arbitrary props, so wrap it to expose a testid
  // hook for the admin-page test suite.
  return (
    <div data-testid="merge-candidate-card">
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">候選 {candidate.id}</CardTitle>
          <Badge variant="info">{match_reason}</Badge>
          <Badge variant="default">confidence {confidence}</Badge>
          {datasetPath && (
            <DatasetBadge path={datasetPath} label={file?.dataset_root ?? datasetPath} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-text-secondary">A：既有 person</div>
            <div className="text-sm text-text-primary">
              姓名：{person?.canonical_name ?? '—'}
            </div>
            <div className="text-sm text-text-secondary">
              電話：{(person?.canonical_phones ?? []).join('、') || '—'}
            </div>
            <div className="text-sm text-text-secondary">
              地址：{person?.canonical_address ?? '—'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-text-secondary">B：新匯入 record</div>
            <div className="text-sm text-text-primary">姓名：{stagingName}</div>
            <div className="text-sm text-text-secondary">
              電話：{stagingPhones.join('、') || '—'}
            </div>
            <div className="text-sm text-text-secondary">地址：{stagingAddress}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={disabled} onClick={onReject}>
            拒絕
          </Button>
          <Button size="sm" disabled={disabled} onClick={onConfirm}>
            確認合併
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (default export) — wraps workspace in DashboardLayout.
// ---------------------------------------------------------------------------

export default function MergeCandidatesPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="尋人資料庫 — 合併候選"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫', href: '/superadmin/settings/people-database' },
        { label: '合併候選' },
      ]}
    >
      <MergeCandidatesWorkspace />
    </DashboardLayout>
  );
}
