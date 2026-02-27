'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Check, X, Eye, Grid } from 'lucide-react';
import { clsx } from 'clsx';

// --- Types ---

interface Role {
  id: string;
  name: string;
  label: string;
  description?: string;
}

type PermissionState = 'allow' | 'deny' | 'readonly';

interface PermissionMatrix {
  [roleId: string]: {
    [resourceId: string]: PermissionState;
  };
}

interface Resource {
  id: string;
  name: string;
  category: 'System' | 'Business' | 'Finance' | 'Operational';
}

// --- Constants ---

const ROLES: Role[] = [
  { id: 'contract_tenant',      name: 'contract_tenant',      label: '合約承租人' },
  { id: 'contract_buyer',       name: 'contract_buyer',       label: '合約買方' },
  { id: 'potential_tenant',     name: 'potential_tenant',     label: '潛在承租人' },
  { id: 'potential_buyer',      name: 'potential_buyer',      label: '潛在買方' },
  { id: 'unregister',           name: 'unregister',           label: '未註冊使用者' },
  { id: 'register',             name: 'register',             label: '已註冊使用者' },
  { id: 'vendor',               name: 'vendor',               label: '供應商' },
  { id: 'auditor',              name: 'auditor',              label: '稽核人員' },
  { id: 'system_engineer',      name: 'system_engineer',      label: '系統工程師' },
  { id: 'cybersecurity_engineer', name: 'cybersecurity_engineer', label: '資安工程師' },
];

const RESOURCES: Resource[] = [
  { id: 'properties',  name: 'Properties (房源)',            category: 'Business' },
  { id: 'contracts',   name: 'Contracts (合約)',              category: 'Business' },
  { id: 'users',       name: 'User Management (用戶管理)',    category: 'System' },
  { id: 'finance',     name: 'Financial Reports (財務報表)', category: 'Finance' },
  { id: 'logs',        name: 'System Logs (系統日誌)',        category: 'System' },
  { id: 'audit',       name: 'Audit Trails (審計紀錄)',       category: 'System' },
  { id: 'maintenance', name: 'Maintenance (房屋維修)',        category: 'Operational' },
  { id: 'settings',    name: 'System Settings (系統設定)',    category: 'System' },
];

const INITIAL_MATRIX: PermissionMatrix = {
  contract_tenant:        { properties: 'readonly', contracts: 'readonly', maintenance: 'allow',    users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  contract_buyer:         { properties: 'readonly', contracts: 'readonly', maintenance: 'deny',     users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  potential_tenant:       { properties: 'readonly', contracts: 'deny',     maintenance: 'deny',     users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  potential_buyer:        { properties: 'readonly', contracts: 'deny',     maintenance: 'deny',     users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  unregister:             { properties: 'readonly', contracts: 'deny',     maintenance: 'deny',     users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  register:               { properties: 'readonly', contracts: 'deny',     maintenance: 'deny',     users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  vendor:                 { properties: 'deny',     contracts: 'deny',     maintenance: 'allow',    users: 'deny',     finance: 'deny',     logs: 'deny',     audit: 'deny',     settings: 'deny' },
  auditor:                { properties: 'readonly', contracts: 'readonly', maintenance: 'readonly', users: 'readonly', finance: 'readonly', logs: 'readonly', audit: 'allow',    settings: 'deny' },
  system_engineer:        { properties: 'allow',    contracts: 'allow',    maintenance: 'allow',    users: 'allow',    finance: 'deny',     logs: 'allow',    audit: 'readonly', settings: 'allow' },
  cybersecurity_engineer: { properties: 'readonly', contracts: 'readonly', maintenance: 'readonly', users: 'readonly', finance: 'readonly', logs: 'allow',    audit: 'allow',    settings: 'readonly' },
};

// --- Component ---

export function PermissionMatrixTab() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(INITIAL_MATRIX);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredResources = useMemo(() => {
    return RESOURCES.filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const togglePermission = (roleId: string, resourceId: string) => {
    setMatrix(prev => {
      const current = prev[roleId]?.[resourceId] || 'deny';
      let next: PermissionState = 'deny';
      if (current === 'deny') next = 'readonly';
      else if (current === 'readonly') next = 'allow';
      else next = 'deny';
      return { ...prev, [roleId]: { ...prev[roleId], [resourceId]: next } };
    });
  };

  const getPermissionIcon = (state: PermissionState) => {
    switch (state) {
      case 'allow':    return <Check className="w-5 h-5 text-emerald-500" />;
      case 'readonly': return <Eye   className="w-5 h-5 text-blue-500" />;
      case 'deny':     return <X     className="w-5 h-5 text-red-500" />;
      default:         return <X     className="w-5 h-5 text-gray-300" />;
    }
  };

  const categories = ['All', ...Array.from(new Set(RESOURCES.map(r => r.category)))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Grid className="text-emerald-500 w-5 h-5" />
          Role Access Matrix（權限矩陣）
        </h2>
        <p className="text-gray-400 text-sm">Manage granular permissions for all system roles across different resources.</p>
      </div>

      {/* Controls */}
      <div className="bg-[#2A2A2A] p-4 rounded-lg border border-[#333333] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search resources..."
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-600 outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap',
                  selectedCategory === cat
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-[#1A1A1A] border-[#333333] text-gray-400 hover:text-white hover:bg-[#333333]'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 bg-[#1A1A1A] px-3 py-1.5 rounded border border-[#333333]">
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Allow</span>
          <span className="flex items-center gap-1"><Eye   className="w-3 h-3 text-blue-500" />    Read Only</span>
          <span className="flex items-center gap-1"><X     className="w-3 h-3 text-red-500" />     Deny</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-380px)] relative">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-[#1A1A1A] text-gray-400">
              <tr>
                <th className="p-4 font-medium sticky left-0 top-0 bg-[#1A1A1A] z-20 border-b border-r border-[#333333] min-w-[140px]">
                  分類
                </th>
                <th className="p-4 font-medium sticky left-[140px] top-0 bg-[#1A1A1A] z-20 border-b border-r border-[#333333] min-w-[240px]">
                  Resources
                </th>
                {ROLES.map(role => (
                  <th key={role.id} className="p-4 font-medium text-center sticky top-0 bg-[#1A1A1A] z-10 border-b border-[#333333] min-w-[140px]">
                    <div className="flex flex-col items-center" title={role.label}>
                      <span className="text-white whitespace-nowrap font-semibold">{role.name}</span>
                      <span className="text-xs text-gray-500 mt-1 whitespace-nowrap">{role.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {filteredResources.map(resource => (
                <tr key={resource.id} className="hover:bg-[#333333]/50 transition-colors">
                  <td className="p-4 font-medium text-xs text-emerald-400 sticky left-0 z-10 bg-[#2A2A2A] border-r border-[#333333] whitespace-nowrap">
                    {resource.category}
                  </td>
                  <td className="p-4 font-medium text-white sticky left-[140px] z-10 bg-[#2A2A2A] border-r border-[#333333]">
                    <span className="whitespace-nowrap">{resource.name}</span>
                  </td>
                  {ROLES.map(role => {
                    const state = matrix[role.id]?.[resource.id] || 'deny';
                    return (
                      <td key={`${role.id}-${resource.id}`} className="p-4 text-center border-r border-[#333333] last:border-r-0">
                        <button
                          onClick={() => togglePermission(role.id, resource.id)}
                          className={clsx(
                            'w-8 h-8 rounded-md flex items-center justify-center mx-auto transition-all',
                            state === 'allow'    && 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20',
                            state === 'readonly' && 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20',
                            state === 'deny'     && 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
                          )}
                          title={`Toggle: ${role.name} → ${resource.name}`}
                        >
                          {getPermissionIcon(state)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm">
          <Download className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
}
