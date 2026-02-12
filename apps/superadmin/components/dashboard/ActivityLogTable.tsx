'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FileText, User, Settings, Clock, AlertCircle } from 'lucide-react';

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  status: 'success' | 'failure';
}

const mockLogs: ActivityLog[] = [
  {
    id: '1',
    user: 'Super Admin',
    action: '登入系統',
    target: 'System',
    timestamp: '2026-02-07 10:00:00',
    status: 'success',
  },
  {
    id: '2',
    user: 'Super Admin',
    action: '更新系統設定',
    target: 'Settings',
    timestamp: '2026-02-07 10:05:23',
    status: 'success',
  },
  {
    id: '3',
    user: 'Admin User',
    action: '刪除用戶',
    target: 'User: 123',
    timestamp: '2026-02-06 18:30:00',
    status: 'failure',
  },
  {
    id: '4',
    user: 'Super Admin',
    action: '備份資料庫',
    target: 'Database',
    timestamp: '2026-02-06 12:00:00',
    status: 'success',
  },
  {
    id: '5',
    user: 'System',
    action: '自動清理暫存',
    target: 'Cache',
    timestamp: '2026-02-06 03:00:00',
    status: 'success',
  },
];

export function ActivityLogTable() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          最近活動日誌
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3">時間</th>
                <th className="px-4 py-3">用戶</th>
                <th className="px-4 py-3">操作</th>
                <th className="px-4 py-3">目標</th>
                <th className="px-4 py-3">狀態</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{log.timestamp}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{log.user}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.action}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.target}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {log.status === 'success' ? '成功' : '失敗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
