'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Download, Upload, Plus, Check, X, 
  Trash2, Shield, AlertTriangle, Loader2, Menu,
  Eye, Lock, Grid
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---

interface Role {
  id: string;
  name: string;
  label: string; // Chinese Label
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
  { id: 'contract_tenant', name: 'contract_tenant', label: '合約承租人' },
  { id: 'contract_buyer', name: 'contract_buyer', label: '合約買方' },
  { id: 'potential_tenant', name: 'potential_tenant', label: '潛在承租人' },
  { id: 'potential_buyer', name: 'potential_buyer', label: '潛在買方' },
  { id: 'unregister', name: 'unregister', label: '未註冊使用者' },
  { id: 'register', name: 'register', label: '已註冊使用者' },
  { id: 'vendor', name: 'vendor', label: '供應商' },
  { id: 'auditor', name: 'auditor', label: '稽核人員' },
  { id: 'system_engineer', name: 'system_engineer', label: '系統工程師' },
  { id: 'cybersecurity_engineer', name: 'cybersecurity_engineer', label: '資安工程師' },
];

const RESOURCES: Resource[] = [
  { id: 'properties', name: 'Properties (房源)', category: 'Business' },
  { id: 'contracts', name: 'Contracts (合約)', category: 'Business' },
  { id: 'users', name: 'User Management (用戶管理)', category: 'System' },
  { id: 'finance', name: 'Financial Reports (財務報表)', category: 'Finance' },
  { id: 'logs', name: 'System Logs (系統日誌)', category: 'System' },
  { id: 'audit', name: 'Audit Trails (審計紀錄)', category: 'System' },
  { id: 'maintenance', name: 'Maintenance (房屋維修)', category: 'Operational' },
  { id: 'settings', name: 'System Settings (系統設定)', category: 'System' },
];

const INITIAL_MATRIX: PermissionMatrix = {
  contract_tenant: { properties: 'readonly', contracts: 'readonly', maintenance: 'allow', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  contract_buyer: { properties: 'readonly', contracts: 'readonly', maintenance: 'deny', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  potential_tenant: { properties: 'readonly', contracts: 'deny', maintenance: 'deny', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  potential_buyer: { properties: 'readonly', contracts: 'deny', maintenance: 'deny', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  unregister: { properties: 'readonly', contracts: 'deny', maintenance: 'deny', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  register: { properties: 'readonly', contracts: 'deny', maintenance: 'deny', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  vendor: { properties: 'deny', contracts: 'deny', maintenance: 'allow', users: 'deny', finance: 'deny', logs: 'deny', audit: 'deny', settings: 'deny' },
  auditor: { properties: 'readonly', contracts: 'readonly', maintenance: 'readonly', users: 'readonly', finance: 'readonly', logs: 'readonly', audit: 'allow', settings: 'deny' },
  system_engineer: { properties: 'allow', contracts: 'allow', maintenance: 'allow', users: 'allow', finance: 'deny', logs: 'allow', audit: 'readonly', settings: 'allow' },
  cybersecurity_engineer: { properties: 'readonly', contracts: 'readonly', maintenance: 'readonly', users: 'readonly', finance: 'readonly', logs: 'allow', audit: 'allow', settings: 'readonly' },
};

export default function RoleAccessMatrixPage() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(INITIAL_MATRIX);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Filter resources based on search and category
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
      
      // Cycle: deny -> readonly -> allow -> deny
      if (current === 'deny') next = 'readonly';
      else if (current === 'readonly') next = 'allow';
      else next = 'deny';

      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [resourceId]: next
        }
      };
    });
  };

  const getPermissionIcon = (state: PermissionState) => {
    switch (state) {
      case 'allow': return <Check className="w-5 h-5 text-emerald-500" />;
      case 'readonly': return <Eye className="w-5 h-5 text-blue-500" />;
      case 'deny': return <X className="w-5 h-5 text-red-500" />;
      default: return <X className="w-5 h-5 text-gray-300" />;
    }
  };

  const categories = ['All', ...Array.from(new Set(RESOURCES.map(r => r.category)))];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Grid className="text-emerald-600 w-6 h-6" />
          Role Access Matrix (權限矩陣)
        </h1>
        <p className="text-gray-500 text-sm">Manage granular permissions for all system roles across different resources.</p>
      </div>

      {/* Controls & Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search resources..." 
              className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-gray-900 placeholder-gray-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap",
                  selectedCategory === cat 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500"/> Allow</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-500"/> Read Only</span>
                <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500"/> Deny</span>
            </div>
        </div>
      </div>

      {/* Matrix Table Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-300px)] relative">
            <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-gray-50 text-gray-500">
                <tr>
                <th className="p-4 font-medium sticky left-0 top-0 bg-gray-50 z-20 border-b border-r border-gray-200 min-w-[240px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                    Resources
                </th>
                {ROLES.map(role => (
                    <th key={role.id} className="p-4 font-medium text-center sticky top-0 bg-gray-50 z-10 border-b border-gray-200 min-w-[140px]">
                    <div className="flex flex-col items-center group cursor-help" title={role.description || role.label}>
                        <span className="text-gray-900 whitespace-nowrap font-semibold">{role.name}</span>
                        <span className="text-xs text-gray-500 mt-1 whitespace-nowrap">{role.label}</span>
                    </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredResources.map((resource, idx) => (
                <tr 
                    key={resource.id} 
                    className="hover:bg-gray-50 transition-colors"
                >
                    <td className="p-4 font-medium text-gray-900 sticky left-0 z-10 bg-white border-r border-gray-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col">
                        <span className="whitespace-nowrap">{resource.name}</span>
                        <span className="text-xs text-emerald-600 mt-0.5 bg-emerald-50 w-fit px-1.5 py-0.5 rounded">{resource.category}</span>
                    </div>
                    </td>
                    {ROLES.map(role => {
                    const state = matrix[role.id]?.[resource.id] || 'deny';
                    return (
                        <td key={`${role.id}-${resource.id}`} className="p-4 text-center border-r border-gray-100 last:border-r-0">
                        <button
                            onClick={() => togglePermission(role.id, resource.id)}
                            className={clsx(
                            "w-8 h-8 rounded-md flex items-center justify-center mx-auto transition-all",
                            state === 'allow' && "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100",
                            state === 'readonly' && "bg-blue-50 border border-blue-200 hover:bg-blue-100",
                            state === 'deny' && "bg-red-50 border border-red-100 hover:bg-red-100" // Light red for deny
                            )}
                            title={`Toggle: ${role.name} -> ${resource.name}`}
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
      
      {/* Footer / Actions */}
      <div className="flex justify-end pt-2">
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-emerald-200">
            <Download className="w-4 h-4" />
            Save Configuration
        </button>
      </div>
    </div>
  );
}
