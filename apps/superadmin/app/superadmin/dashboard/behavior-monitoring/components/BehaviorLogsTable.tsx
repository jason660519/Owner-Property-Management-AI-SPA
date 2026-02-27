'use client';

import { useState, useTransition } from 'react';
import { Search, Filter, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getBehaviorLogs } from '../actions';
import type { BehaviorLog } from '../actions';

interface BehaviorLogsTableProps {
  initialLogs: BehaviorLog[];
  initialTotal: number;
}

const ACTION_TYPES = ['ALL', 'PAGE_VIEW', 'CLICK', 'FORM_SUBMIT', 'API_CALL'];

const ACTION_BADGE_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  PAGE_VIEW: 'info',
  CLICK: 'default',
  FORM_SUBMIT: 'success',
  API_CALL: 'warning',
};

const PAGE_SIZE = 50;

export default function BehaviorLogsTable({ initialLogs, initialTotal }: BehaviorLogsTableProps) {
  const [logs, setLogs] = useState<BehaviorLog[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('ALL');
  const [showAnomalyOnly, setShowAnomalyOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = (opts: {
    search?: string;
    actionType?: string;
    showAnomalyOnly?: boolean;
    page?: number;
  }) => {
    startTransition(async () => {
      const s = opts.search ?? search;
      const at = opts.actionType ?? actionType;
      const anomaly = opts.showAnomalyOnly ?? showAnomalyOnly;
      const p = opts.page ?? page;

      const result = await getBehaviorLogs({
        search: s || undefined,
        actionType: at !== 'ALL' ? at : undefined,
        isAnomaly: anomaly ? true : undefined,
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
      });
      setLogs(result.logs);
      setTotal(result.total);
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    fetchLogs({ search: value, page: 0 });
  };

  const handleActionType = (type: string) => {
    setActionType(type);
    setPage(0);
    fetchLogs({ actionType: type, page: 0 });
  };

  const handleAnomalyToggle = () => {
    const next = !showAnomalyOnly;
    setShowAnomalyOnly(next);
    setPage(0);
    fetchLogs({ showAnomalyOnly: next, page: 0 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs({ page: newPage });
  };

  return (
    <Card className="bg-[#2A2A2A] border-[#333333]">
      <CardHeader className="border-b border-[#333333] pb-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <CardTitle className="text-white text-base">
            行為日誌{' '}
            <span className="text-gray-400 text-sm font-normal ml-2">
              共 {total.toLocaleString()} 筆
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnomalyToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                showAnomalyOnly
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-[#1A1A1A] text-gray-400 border border-[#333333] hover:border-gray-500'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              僅顯示異常
            </button>
            <Button
              variant="outline"
              onClick={() => fetchLogs({})}
              disabled={isPending}
              className="border-[#333333] text-gray-400 hover:text-white h-8 px-3 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜尋路徑或 IP..."
              className="pl-9 bg-[#1A1A1A] border-[#444444] text-white text-sm h-9"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-500" />
            {ACTION_TYPES.map(type => (
              <button
                key={type}
                onClick={() => handleActionType(type)}
                className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                  actionType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#333333]'
                }`}
              >
                {type === 'ALL' ? '全部' : type}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-[#333333] text-gray-400 text-xs">
              <tr>
                <th className="px-4 py-3">時間</th>
                <th className="px-4 py-3">路徑</th>
                <th className="px-4 py-3">類型</th>
                <th className="px-4 py-3">IP 位址</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">異常</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {isPending ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    載入中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    無相關記錄
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    className={`hover:bg-[#333333]/50 transition-colors ${
                      log.is_anomaly ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString('zh-TW')}
                    </td>
                    <td className="px-4 py-3 text-white max-w-[200px] truncate" title={log.page_path}>
                      {log.page_path}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ACTION_BADGE_VARIANT[log.action_type] ?? 'default'}>
                        {log.action_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                      {log.ip_address ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs max-w-[100px] truncate">
                      {log.user_id ? log.user_id.substring(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {log.is_anomaly && (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          異常
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#333333]">
            <span className="text-xs text-gray-500">
              第 {page + 1} / {totalPages} 頁
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0 || isPending}
                className="h-7 w-7 p-0 border-[#333333]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1 || isPending}
                className="h-7 w-7 p-0 border-[#333333]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
