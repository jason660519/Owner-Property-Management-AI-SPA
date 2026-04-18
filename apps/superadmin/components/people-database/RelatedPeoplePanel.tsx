'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  MapPin,
  Phone,
  Smartphone,
  Building2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RelatedSource {
  full_name?: string;
  name?: string;
  id_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  address_normalized?: string;
  company?: string;
  dataset_path?: string;
  record_id?: string;
  data_source?: string;
}

interface RelatedItem {
  record_id: string;
  source: RelatedSource;
  score: number;
}

interface RelatedResponse {
  seed: { record_id: string; source: RelatedSource | null } | null;
  targets: {
    address: string | null;
    phone: string | null;
    mobile: string | null;
    company: string | null;
  };
  groups: {
    address: RelatedItem[];
    phone: RelatedItem[];
    mobile: RelatedItem[];
    company: RelatedItem[];
  };
}

export interface RelatedPeoplePanelProps {
  /**
   * Pivot the search on an existing record. The endpoint will fetch the seed
   * doc first, then derive identifiers (address / phone / mobile / company)
   * from it. Mutually compatible with explicit identifier props (explicit
   * props take priority).
   */
  recordId?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  /** Per-group result cap forwarded as `size`. Default 50, max 200. */
  size?: number;
  /** Render heading inline if true; otherwise wrap in a card-like container. */
  bare?: boolean;
}

type GroupKey = 'address' | 'phone' | 'mobile' | 'company';

const GROUP_META: Record<GroupKey, { label: string; icon: typeof Users; emptyHint: string }> = {
  address: { label: '同地址親友', icon: MapPin, emptyHint: '無同住址記錄' },
  phone: { label: '同市話親友', icon: Phone, emptyHint: '無共用市話記錄' },
  mobile: { label: '同手機親友', icon: Smartphone, emptyHint: '無共用手機記錄' },
  company: { label: '同公司同事', icon: Building2, emptyHint: '無同公司記錄' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RelatedPeoplePanel({
  recordId,
  address,
  phone,
  mobile,
  company,
  size = 50,
  bare = false,
}: RelatedPeoplePanelProps) {
  const [data, setData] = useState<RelatedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(() => new Set());

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (recordId) params.set('record_id', recordId);
    if (address) params.set('address', address);
    if (phone) params.set('phone', phone);
    if (mobile) params.set('mobile', mobile);
    if (company) params.set('company', company);
    params.set('size', String(Math.min(200, Math.max(1, size))));
    return params.toString();
  }, [recordId, address, phone, mobile, company, size]);

  useEffect(() => {
    // Bail out when caller supplied no identifiers — render empty state.
    if (!recordId && !address && !phone && !mobile && !company) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/people-db/related?${queryString}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string };
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as RelatedResponse;
      })
      .then((next) => {
        if (cancelled) return;
        setData(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '無法載入親友資料');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryString, recordId, address, phone, mobile, company]);

  const toggleGroup = (key: GroupKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalMatches = data
    ? data.groups.address.length +
      data.groups.phone.length +
      data.groups.mobile.length +
      data.groups.company.length
    : 0;

  const wrapperClass = bare
    ? 'space-y-3'
    : 'rounded-lg border border-border-default bg-bg-primary p-4 space-y-3';

  return (
    <section className={wrapperClass} data-testid="related-people-panel">
      {!bare && (
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">親友關係圖譜</h3>
          </div>
          {data && !loading && (
            <span className="text-xs text-text-secondary">共 {totalMatches} 筆關聯</span>
          )}
        </header>
      )}

      {loading && (
        <div className="flex items-center gap-2 px-2 py-6 text-xs text-text-secondary">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          搜尋親友關係中…
        </div>
      )}

      {error && !loading && (
        <div
          role="alert"
          className="rounded border border-border-default bg-bg-secondary px-3 py-2 text-xs text-text-primary"
        >
          {error}
        </div>
      )}

      {!loading && !error && data && totalMatches === 0 && (
        <p className="px-2 py-4 text-xs text-text-secondary">尚未找到任何同住址 / 同電話 / 同公司的親友。</p>
      )}

      {!loading && !error && data && totalMatches > 0 && (
        <ul className="space-y-2">
          {(Object.keys(GROUP_META) as GroupKey[]).map((key) => {
            const meta = GROUP_META[key];
            const items = data.groups[key];
            const target = data.targets[key];
            const isCollapsed = collapsed.has(key);
            const Icon = meta.icon;

            // Hide groups with no target value AND no results to keep the panel
            // focused on actionable data.
            if (!target && items.length === 0) return null;

            return (
              <li key={key} className="rounded border border-border-default">
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-bg-secondary"
                  aria-expanded={!isCollapsed}
                  data-testid={`related-group-${key}-toggle`}
                >
                  <span className="flex items-center gap-2 text-sm text-text-primary">
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-text-secondary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                    )}
                    <Icon className="h-3.5 w-3.5 text-accent" />
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-xs text-text-secondary">({items.length})</span>
                  </span>
                  {target && (
                    <span className="truncate max-w-[55%] text-[11px] text-text-secondary">
                      {target}
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="border-t border-border-default">
                    {items.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-text-secondary">{meta.emptyHint}</p>
                    ) : (
                      <ul className="divide-y divide-border-default">
                        {items.map((item) => {
                          const displayName =
                            item.source.full_name ?? item.source.name ?? '（無姓名）';
                          const datasetPath =
                            item.source.dataset_path ?? item.source.data_source ?? '—';
                          return (
                            <li
                              key={item.record_id}
                              className="px-3 py-2 text-xs flex flex-col gap-0.5"
                              data-testid={`related-item-${key}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Link
                                  href={`/superadmin/settings/people-database/person/${encodeURIComponent(item.record_id)}`}
                                  className="font-medium text-accent hover:underline truncate"
                                >
                                  {displayName}
                                </Link>
                                <span className="shrink-0 text-text-secondary">
                                  分數 {item.score.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-[11px] text-text-secondary truncate">
                                {datasetPath}
                              </div>
                              {(item.source.address || item.source.phone || item.source.mobile) && (
                                <div className="text-[11px] text-text-secondary truncate">
                                  {[item.source.address, item.source.phone, item.source.mobile]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default RelatedPeoplePanel;
