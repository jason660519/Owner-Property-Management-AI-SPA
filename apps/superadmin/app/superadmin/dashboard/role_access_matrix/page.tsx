'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Download, Upload, Plus, Check, X, 
  Trash2, Shield, AlertTriangle, Loader2, Menu,
  Eye, Lock
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
      case 'allow': return <Check className="w-5 h-5 text-green-500" />;
      case 'readonly': return <Eye className="w-5 h-5 text-blue-500" />;
      case 'deny': return <X className="w-5 h-5 text-red-500" />;
      default: return <X className="w-5 h-5 text-gray-500" />;
    }
  };

  const categories = ['All', ...Array.from(new Set(RESOURCES.map(r => r.category)))];

  return (
    <div className="p-8 bg-[#1A1A1A] min-h-screen text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="text-[#7C3AED] w-8 h-8" />
          Role Access Matrix (權限矩陣)
        </h1>
        <p className="text-[#999999]">Manage granular permissions for all system roles.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#2A2A2A] p-4 rounded-lg border border-[#333333]">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666666] w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search resources..." 
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none text-white placeholder-[#666666]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  selectedCategory === cat 
                    ? "bg-[#7C3AED] border-[#7C3AED] text-white" 
                    : "bg-[#1A1A1A] border-[#333333] text-[#999999] hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
            <div className="flex items-center gap-2 text-xs text-[#999999] px-3 py-1.5 bg-[#1A1A1A] rounded border border-[#333333]">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500"/> Allow</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-500"/> Read Only</span>
                <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500"/> Deny</span>
            </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-[#333333] rounded-lg bg-[#2A2A2A] shadow-inner max-h-[calc(100vh-300px)] relative">
        <table className="w-full text-sm text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-[#333333] text-[#999999]">
              <th className="p-4 font-medium sticky left-0 top-0 bg-[#333333] z-20 border-b border-r border-[#444] min-w-[240px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                Resources
              </th>
              {ROLES.map(role => (
                <th key={role.id} className="p-4 font-medium text-center sticky top-0 bg-[#333333] z-10 border-b border-[#444] min-w-[140px]">
                  <div className="flex flex-col items-center">
                    <span className="text-white whitespace-nowrap">{role.name}</span>
                    <span className="text-xs text-[#999999] mt-1 whitespace-nowrap">{role.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((resource, idx) => (
              <tr 
                key={resource.id} 
                className={clsx(
                  "border-b border-[#333333] transition-colors",
                  idx % 2 === 0 ? "bg-[#2A2A2A]" : "bg-[#252525]",
                  "hover:bg-[#333333]"
                )}
              >
                <td className={clsx(
                  "p-4 font-medium text-white sticky left-0 z-10 border-r border-[#333333] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]",
                  idx % 2 === 0 ? "bg-[#2A2A2A]" : "bg-[#252525]"
                )}>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">{resource.name}</span>
                    <span className="text-xs text-[#7C3AED] mt-0.5">{resource.category}</span>
                  </div>
                </td>
                {ROLES.map(role => {
                  const state = matrix[role.id]?.[resource.id] || 'deny';
                  return (
                    <td key={`${role.id}-${resource.id}`} className="p-4 text-center border-r border-[#333333]/50 last:border-r-0">
                      <button
                        onClick={() => togglePermission(role.id, resource.id)}
                        className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all",
                          state === 'allow' && "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20",
                          state === 'readonly' && "bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20",
                          state === 'deny' && "bg-red-500/5 border border-transparent hover:bg-red-500/10"
                        )}
                        title={`Click to toggle: ${role.name} -> ${resource.name}`}
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
      
      {/* Footer / Actions */}
      <div className="flex justify-end pt-4">
        <button className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" />
            Save Changes
        </button>
      </div>
    </div>
  );
}
