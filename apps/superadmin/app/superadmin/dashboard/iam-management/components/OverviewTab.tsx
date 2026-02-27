'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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
  const displayedLogs = logs;

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target', 'Details', 'Status'];
    const csvContent = [
      headers.join(','),
      ...displayedLogs.map((log) =>
        [
          log.timestamp,
          log.actor,
          log.action,
          log.targetType,
          log.target,
          `"${log.details}"`,
          log.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `iam_audit_report_${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Audit Log Table */}
      <Card className="bg-[#2A2A2A] border-gray-700">
        <CardHeader>
          <CardTitle>詳細異動記錄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-gray-400">
                <tr>
                  <th className="p-4">時間戳記</th>
                  <th className="p-4">操作者</th>
                  <th className="p-4">類型</th>
                  <th className="p-4">目標對象</th>
                  <th className="p-4">變更內容</th>
                  <th className="p-4">詳細說明</th>
                  <th className="p-4">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        載入中...
                      </div>
                    </td>
                  </tr>
                ) : displayedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      無相關記錄
                    </td>
                  </tr>
                ) : (
                  displayedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[#333333] transition-colors">
                      <td className="p-4 text-gray-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium text-white">{log.actor}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            log.targetType === 'USER'
                              ? 'info'
                              : log.targetType === 'ROLE'
                              ? 'warning'
                              : log.targetType === 'GROUP'
                              ? 'success'
                              : 'default'
                          }
                        >
                          {log.targetType}
                        </Badge>
                      </td>
                      <td className="p-4 text-white">{log.target}</td>
                      <td className="p-4 text-purple-400">{log.action}</td>
                      <td
                        className="p-4 text-gray-400 max-w-xs truncate"
                        title={log.details}
                      >
                        {log.details}
                      </td>
                      <td className="p-4">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center text-green-500">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-500">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            失敗
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
