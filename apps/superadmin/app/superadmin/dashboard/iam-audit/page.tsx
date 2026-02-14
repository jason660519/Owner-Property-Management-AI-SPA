'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Lock, 
  Clock, 
  Search, 
  Download, 
  RefreshCw, 
  FileText,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

// --- Types ---
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

interface IAMStats {
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

// --- Components ---

interface StatCardProps {
  title: string;
  value: string | number | {
    totalAccounts: number;
    totalPeople: number;
    activeUsers: number;
  };
  subValue?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = ({ title, value, subValue, icon: Icon, trend }: StatCardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex items-center justify-between pt-2">
        {typeof value === 'object' ? (
           <div className="text-lg font-bold text-white flex flex-col gap-1">
             <div className="flex items-center gap-2">
               <span className="text-gray-400 text-xs w-24">總用戶數:</span>
               <span>{value.totalAccounts}</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-gray-400 text-xs w-24">總人數:</span>
               <span>{value.totalPeople}</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-green-500 text-xs w-24">目前在線人數:</span>
               <span className="text-green-400">{value.activeUsers}</span>
             </div>
           </div>
        ) : (
           <div className="text-2xl font-bold text-white">{value}</div>
        )}
        {subValue && (
          <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : trend === 'down' ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
            {subValue}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function IAMAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<IAMStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/iam/audit');
      const data = await res.json();
      
      if (data.logs) setLogs(data.logs);
      if (data.stats) setStats(data.stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) || 
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'ALL' || log.targetType === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleExport = (type: 'csv' | 'pdf') => {
    // Simple CSV Export implementation
    if (type === 'csv') {
      const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target', 'Details', 'Status'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.timestamp,
          log.actor,
          log.action,
          log.targetType,
          log.target,
          `"${log.details}"`,
          log.status
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `iam_audit_report_${new Date().toISOString()}.csv`;
      link.click();
    } else {
      alert('PDF Export feature coming soon!');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#1A1A1A] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-500" />
            權限快照 IAM Audit Report
          </h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            最後更新: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            匯出 CSV
          </Button>
          <Button variant="primary" onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            匯出 PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="總用戶數／總人數／目前在線人數" 
          value={{
            totalAccounts: stats?.totalAccounts || 0,
            totalPeople: stats?.totalPeople || 0,
            activeUsers: stats?.activeUsers || 0
          }}
          icon={Users} 
          subValue="+2 本週" 
          trend="up" 
        />
        <StatCard 
          title="群組數" 
          value={stats?.totalGroups || 0} 
          icon={Users} 
          subValue="無變動" 
          trend="neutral" 
        />
        <StatCard 
          title="自定義角色數" 
          value={stats?.totalRoles || 0} 
          icon={Lock} 
          subValue="+1 新增" 
          trend="up" 
        />
        <StatCard 
          title="Postgres 預定義角色數" 
          value={stats?.postgresPredefinedRolesCount ?? 0} 
          icon={Lock} 
          subValue="pg_roles" 
          trend="neutral" 
        />
        <StatCard 
          title="今日異動數" 
          value={(stats?.addedToday || 0) + (stats?.modifiedToday || 0) + (stats?.deletedToday || 0)} 
          icon={Activity} 
          subValue="活躍" 
          trend="up" 
        />
      </div>

      {/* Filter Bar */}
      <Card className="bg-[#2A2A2A] border-gray-700">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="搜尋使用者、角色或操作..." 
              className="pl-10 bg-[#1A1A1A] border-gray-600 text-white w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <Filter className="h-4 w-4 text-gray-400" />
            {['ALL', 'USER', 'ROLE', 'GROUP', 'PERMISSION'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  filterType === type 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-[#1A1A1A] text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type === 'ALL' ? '全部' : type}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
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
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      無相關記錄
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#333333] transition-colors">
                      <td className="p-4 text-gray-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium text-white">
                        {log.actor}
                      </td>
                      <td className="p-4">
                        <Badge variant={
                          log.targetType === 'USER' ? 'info' :
                          log.targetType === 'ROLE' ? 'warning' :
                          log.targetType === 'GROUP' ? 'success' : 'default'
                        }>
                          {log.targetType}
                        </Badge>
                      </td>
                      <td className="p-4 text-white">
                        {log.target}
                      </td>
                      <td className="p-4 text-purple-400">
                        {log.action}
                      </td>
                      <td className="p-4 text-gray-400 max-w-xs truncate" title={log.details}>
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
