'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import EnhancedTable from '@/components/ui/EnhancedTable';
import type { ColumnDef } from '@tanstack/react-table';

// --- Types ---
interface IamStats {
  totalAccounts: number;
  totalPeople: number;
  activeUsers: number;
  totalGroups: number;
  totalRoles: number;
  postgresPredefinedRolesCount: number;
  addedToday: number;
  modifiedToday: number;
  deletedToday: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  target: string;
  targetType: 'USER' | 'ROLE' | 'GROUP' | 'PERMISSION';
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILURE';
}

// --- Badge variant helper ---
const targetTypeBadgeVariant = (t: AuditLog['targetType']) => {
  const map: Record<AuditLog['targetType'], 'info' | 'warning' | 'success' | 'default'> = {
    USER: 'info', ROLE: 'warning', GROUP: 'success', PERMISSION: 'default',
  };
  return map[t];
};

// --- Column definitions ---
const columns: ColumnDef<AuditLog, unknown>[] = [
  {
    id: 'timestamp',
    accessorKey: 'timestamp',
    header: '時間戳記',
    meta: { headerEn: 'Timestamp', headerZh: '時間戳記' },
    cell: ({ getValue }) => (
      <span className="text-gray-300 whitespace-nowrap">
        {new Date(getValue<string>()).toLocaleString()}
      </span>
    ),
  },
  {
    id: 'actor',
    accessorKey: 'actor',
    header: '操作者',
    meta: { headerEn: 'Actor', headerZh: '操作者' },
    cell: ({ getValue }) => <span className="font-medium text-white">{getValue<string>()}</span>,
  },
  {
    id: 'targetType',
    accessorKey: 'targetType',
    header: '類型',
    meta: { headerEn: 'Target Type', headerZh: '類型' },
    cell: ({ getValue }) => {
      const v = getValue<AuditLog['targetType']>();
      return <Badge variant={targetTypeBadgeVariant(v)}>{v}</Badge>;
    },
  },
  {
    id: 'target',
    accessorKey: 'target',
    header: '目標對象',
    meta: { headerEn: 'Target Object', headerZh: '目標對象' },
    cell: ({ getValue }) => <span className="text-white">{getValue<string>()}</span>,
  },
  {
    id: 'action',
    accessorKey: 'action',
    header: '變更內容',
    meta: { headerEn: 'Action', headerZh: '變更內容' },
    cell: ({ getValue }) => <span className="text-purple-400">{getValue<string>()}</span>,
  },
  {
    id: 'details',
    accessorKey: 'details',
    header: '詳細說明',
    meta: { headerEn: 'Details', headerZh: '詳細說明' },
    cell: ({ getValue }) => (
      <span className="text-gray-400 max-w-xs truncate block" title={getValue<string>()}>
        {getValue<string>()}
      </span>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: '狀態',
    meta: { headerEn: 'Status', headerZh: '狀態' },
    cell: ({ getValue }) => {
      const ok = getValue<string>() === 'SUCCESS';
      return (
        <span className={`inline-flex items-center ${ok ? 'text-green-500' : 'text-red-500'}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
          {ok ? '成功' : '失敗'}
        </span>
      );
    },
  },
];

const INITIAL_WIDTHS = [14, 12, 10, 14, 16, 22, 12];

// --- OverviewTab ---
export function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<IamStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/iam/audit');
      const data = await res.json();
      if (data.logs) setLogs(data.logs as AuditLog[]);
      if (data.stats) setStats(data.stats as IamStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target', 'Details', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logs.map((log) =>
        [log.timestamp, log.actor, log.action, log.targetType, log.target, `"${log.details}"`, log.status].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `iam_audit_report_${new Date().toISOString()}.csv`;
    link.click();
  };

  const csvButton = useMemo(() => (
    <button
      type="button"
      onClick={handleExportCsv}
      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary whitespace-nowrap"
    >
      <Download className="w-3.5 h-3.5" />匯出 CSV
    </button>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center gap-2 p-12 text-gray-400">
        <RefreshCw className="h-5 w-5 animate-spin" />載入中...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Audit Log Table */}
      <Card className="bg-[#2A2A2A] border-gray-700">
        <CardHeader>
          <CardTitle>詳細異動記錄</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedTable<AuditLog>
            tableId="iam_audit_log"
            columns={columns}
            data={logs}
            initialWidths={INITIAL_WIDTHS}
            getCategoryValue={(row) => row.targetType}
            getSearchValue={(row) => `${row.actor} ${row.target} ${row.action}`}
            pageSizes={[20, 50, 100]}
            extraToolbar={csvButton}
          />
        </CardContent>
      </Card>
    </div>
  );
}
