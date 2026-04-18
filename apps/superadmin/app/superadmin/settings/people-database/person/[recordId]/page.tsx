'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  User,
  IdCard,
  Phone,
  Smartphone,
  Mail,
  MapPin,
  Building2,
  CalendarDays,
  Database,
  Hash,
  FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import RelatedPeoplePanel from '@/components/people-database/RelatedPeoplePanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonDetail {
  record_id: string;
  full_name: string;
  id_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  address_normalized: string | null;
  company: string | null;
  birth_date: string | null;
  note: string | null;
  data_source: string | null;
  dataset_path: string | null;
  quality_score: number | null;
  import_batch_id: string | null;
  source_file_path: string | null;
  source_document_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function toPercentQuality(score: number | null): number | null {
  if (score === null || Number.isNaN(score)) return null;
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function qualityVariant(score: number | null): 'success' | 'warning' | 'error' | 'default' {
  const normalized = toPercentQuality(score);
  if (normalized === null) return 'default';
  if (normalized >= 80) return 'success';
  if (normalized >= 50) return 'warning';
  return 'error';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('zh-TW');
  } catch {
    return value;
  }
}

interface FieldRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  mono?: boolean;
}

function FieldRow({ icon: Icon, label, value, mono = false }: FieldRowProps) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border-default last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 text-text-secondary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</div>
        <div
          className={`text-sm text-text-primary break-words ${mono ? 'font-mono text-xs' : ''}`}
        >
          {value && value.trim().length > 0 ? value : '—'}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PeopleDatabasePersonPage() {
  const params = useParams<{ recordId: string }>();
  const recordId = decodeURIComponent(params?.recordId ?? '');

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/people-db/person/${encodeURIComponent(recordId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string };
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as PersonDetail;
      })
      .then((data) => {
        if (cancelled) return;
        setPerson(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '無法載入人員資料');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle={person ? `人員資料 — ${person.full_name || recordId}` : '人員資料'}
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫', href: '/superadmin/settings/people-database' },
        { label: '人員資料' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/superadmin/settings/people-database"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回尋人資料庫
          </Link>
          {person?.quality_score !== null && person?.quality_score !== undefined && (
            <Badge variant={qualityVariant(person.quality_score)}>
              品質 {toPercentQuality(person.quality_score)}
            </Badge>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-text-secondary py-12 justify-center">
            <RefreshCw className="h-4 w-4 animate-spin" />
            載入人員資料中…
          </div>
        )}

        {error && !loading && (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <p className="text-sm text-text-primary">無法顯示這筆資料</p>
              <p className="text-xs text-text-secondary">{error}</p>
              <p className="font-mono text-[11px] text-text-secondary">record_id: {recordId}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && person && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* ---- Main column: identity + provenance ---- */}
            <div className="space-y-6 min-w-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-accent" />
                    {person.full_name || '（無姓名）'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <FieldRow icon={IdCard} label="身分證字號" value={person.id_number} mono />
                    <FieldRow icon={CalendarDays} label="出生日期" value={person.birth_date} />
                    <FieldRow icon={Phone} label="市話" value={person.phone} mono />
                    <FieldRow icon={Smartphone} label="手機" value={person.mobile} mono />
                    <FieldRow icon={Mail} label="Email" value={person.email} />
                    <FieldRow icon={Building2} label="公司" value={person.company} />
                    <FieldRow icon={MapPin} label="地址" value={person.address} />
                    <FieldRow
                      icon={MapPin}
                      label="地址（標準化）"
                      value={person.address_normalized}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-accent" />
                    資料來源與匯入軌跡
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <FieldRow icon={Database} label="Dataset Path" value={person.dataset_path} mono />
                    <FieldRow icon={Database} label="Data Source" value={person.data_source} />
                    <FieldRow
                      icon={Hash}
                      label="匯入批次"
                      value={person.import_batch_id}
                      mono
                    />
                    <FieldRow
                      icon={FileText}
                      label="原始檔案"
                      value={person.source_file_path}
                      mono
                    />
                    <FieldRow
                      icon={Hash}
                      label="原始文件 ID"
                      value={person.source_document_id}
                      mono
                    />
                    <FieldRow icon={Hash} label="Record ID" value={person.record_id} mono />
                    <FieldRow icon={CalendarDays} label="建立時間" value={formatDate(person.created_at)} />
                    <FieldRow icon={CalendarDays} label="更新時間" value={formatDate(person.updated_at)} />
                  </div>
                  {person.note && (
                    <div className="mt-3 rounded border border-border-default bg-bg-secondary p-3 text-xs text-text-primary whitespace-pre-wrap">
                      {person.note}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ---- Side column: related-people panel ---- */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <RelatedPeoplePanel recordId={person.record_id} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
