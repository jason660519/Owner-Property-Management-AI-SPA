'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  Plus,
  Trash2,
  Check,
  Clock,
  User,
  Activity,
  AlertCircle,
  Search,
  Edit,
  X,
  GitBranch,
  FileText,
} from 'lucide-react';
import { getRoles, createRole, deleteRole, updateRole, getRbacAuditLogs } from './actions';
import type { Role, RbacAuditLog } from './actions';

type Resource = 'Properties' | 'Users' | 'Contracts' | 'Reports' | 'Finance' | 'Logs' | 'Config';
type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

const RESOURCES: Resource[] = ['Properties', 'Users', 'Contracts', 'Reports', 'Finance', 'Logs', 'Config'];
const ACTIONS: Action[] = ['create', 'read', 'update', 'delete', 'manage'];

const ACTION_LOG_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  ASSIGN: 'warning',
  REVOKE: 'default',
};

export default function RBACPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, Action[]>>>({});
  const [auditLogs, setAuditLogs] = useState<RbacAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'permissions' | 'audit'>('permissions');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: '', name: '', description: '', parent_role_id: '' });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
    loadAuditLogs();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const data = await getRoles();
      setRoles(data);
      if (data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    const logs = await getRbacAuditLogs(30);
    setAuditLogs(logs);
  };

  const filteredRoles = roles.filter(
    role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrUpdate = async () => {
    if (!roleForm.name) return;

    const formData = new FormData();
    formData.append('name', roleForm.name);
    formData.append('description', roleForm.description);
    if (roleForm.parent_role_id) {
      formData.append('parent_role_id', roleForm.parent_role_id);
    }

    if (isEditMode && roleForm.id) {
      formData.append('id', roleForm.id);
      await updateRole(formData);
    } else {
      await createRole(formData);
    }

    setIsModalOpen(false);
    setRoleForm({ id: '', name: '', description: '', parent_role_id: '' });
    setIsEditMode(false);
    await loadRoles();
    await loadAuditLogs();
  };

  const handleDeleteRole = async (id: string, name: string) => {
    setDeleteError(null);
    if (!window.confirm(`確定要刪除角色 "${name}"？此操作無法復原。`)) return;

    const result = await deleteRole(id, name);
    if (result.error) {
      setDeleteError(result.error);
      setTimeout(() => setDeleteError(null), 5000);
      return;
    }

    await loadRoles();
    await loadAuditLogs();
    if (selectedRole?.id === id) setSelectedRole(null);
  };

  const openEditModal = (role: Role) => {
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description,
      parent_role_id: role.parent_role_id ?? '',
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setRoleForm({ id: '', name: '', description: '', parent_role_id: '' });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const togglePermission = (roleId: string, resource: string, action: Action) => {
    setPermissions(prev => {
      const rolePerms = prev[roleId] || {};
      const resourceActions = rolePerms[resource] || [];
      const newActions = resourceActions.includes(action)
        ? resourceActions.filter(a => a !== action)
        : [...resourceActions, action];
      return { ...prev, [roleId]: { ...rolePerms, [resource]: newActions } };
    });
  };

  const getParentRoleName = (parentId: string | null) => {
    if (!parentId) return null;
    return roles.find(r => r.id === parentId)?.name ?? parentId.substring(0, 8) + '...';
  };

  return (
    <div className="p-8 bg-[#1A1A1A] min-h-screen text-white space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="text-[#7C3AED] w-7 h-7" />
            RBAC Access Control
          </h1>
          <p className="text-[#999999] mt-1 text-sm">管理系統角色、權限及存取政策</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center gap-2"
        >
          <Plus size={16} />
          新增角色
        </Button>
      </div>

      {/* Delete Error Banner */}
      {deleteError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle size={16} />
          {deleteError}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Role List */}
        <div className="col-span-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666666] w-4 h-4" />
            <input
              type="text"
              placeholder="搜尋角色..."
              className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-8 text-[#666666] text-sm">載入中...</div>
            ) : (
              filteredRoles.map(role => (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-all border ${
                    selectedRole?.id === role.id
                      ? 'bg-[#2A2A2A] border-[#7C3AED]'
                      : 'bg-[#2A2A2A] border-[#333333] hover:border-[#666666]'
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{role.name}</h3>
                      <p className="text-xs text-[#999999] mt-1 line-clamp-2">{role.description}</p>
                      {role.parent_role_id && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
                          <GitBranch size={10} />
                          繼承: {getParentRoleName(role.parent_role_id)}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-[#666666]">
                        <Clock size={11} />
                        {new Date(role.created_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      <button
                        onClick={e => { e.stopPropagation(); openEditModal(role); }}
                        className="p-1.5 hover:bg-[#333333] rounded text-[#999999] hover:text-white"
                        title="編輯"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}
                        className="p-1.5 hover:bg-red-500/20 rounded text-[#999999] hover:text-red-500"
                        title="刪除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-8">
          {selectedRole ? (
            <Card className="bg-[#2A2A2A] border-[#333333]">
              <CardHeader className="border-b border-[#333333] pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <User className="text-[#7C3AED] w-4 h-4" />
                      {selectedRole.name}
                    </CardTitle>
                    <p className="text-xs text-[#999999] mt-1">{selectedRole.description}</p>
                    {selectedRole.parent_role_id && (
                      <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                        <GitBranch size={11} />
                        繼承自: {getParentRoleName(selectedRole.parent_role_id)}
                      </p>
                    )}
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActiveTab('permissions')}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${
                        activeTab === 'permissions'
                          ? 'bg-[#7C3AED] text-white'
                          : 'text-[#999999] hover:bg-[#333333]'
                      }`}
                    >
                      <Activity size={12} className="inline mr-1" />
                      權限
                    </button>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${
                        activeTab === 'audit'
                          ? 'bg-[#7C3AED] text-white'
                          : 'text-[#999999] hover:bg-[#333333]'
                      }`}
                    >
                      <FileText size={12} className="inline mr-1" />
                      稽核日誌
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {activeTab === 'permissions' ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Permission Matrix</h3>
                      <div className="text-xs text-[#666666] flex items-center gap-1">
                        <AlertCircle size={11} />
                        視覺化展示（DB 持久化待接入）
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-[#999999] uppercase bg-[#333333]">
                          <tr>
                            <th className="px-3 py-2.5 rounded-tl-lg">Resource</th>
                            {ACTIONS.map(action => (
                              <th key={action} className="px-3 py-2.5 text-center">{action}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {RESOURCES.map(resource => (
                            <tr key={resource} className="border-b border-[#333333] hover:bg-[#333333]/50">
                              <td className="px-3 py-3 font-medium text-white text-sm">{resource}</td>
                              {ACTIONS.map(action => {
                                const isGranted = permissions[selectedRole.id]?.[resource]?.includes(action);
                                return (
                                  <td key={`${resource}-${action}`} className="px-3 py-3 text-center">
                                    <button
                                      onClick={() => togglePermission(selectedRole.id, resource, action)}
                                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mx-auto ${
                                        isGranted
                                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                          : 'bg-[#1A1A1A] border-[#666666] text-transparent hover:border-[#999999]'
                                      }`}
                                    >
                                      <Check size={11} />
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  /* Audit Log Tab */
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-[#666666] text-sm">無稽核記錄</div>
                    ) : (
                      auditLogs
                        .filter(log => !selectedRole || log.role_name === selectedRole.name || log.role_id === selectedRole.id)
                        .map(log => (
                          <div key={log.id} className="flex items-start gap-3 p-3 rounded-md bg-[#1A1A1A] border border-[#333333]">
                            <Badge variant={ACTION_LOG_VARIANT[log.action] ?? 'default'} className="flex-shrink-0 mt-0.5">
                              {log.action}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-white font-medium truncate">{log.role_name}</span>
                                <span className="text-xs text-[#666666] whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString('zh-TW')}
                                </span>
                              </div>
                              {log.actor_email && (
                                <p className="text-xs text-[#999999] mt-0.5">{log.actor_email}</p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                    {auditLogs.filter(log => !selectedRole || log.role_name === selectedRole.name).length === 0 && auditLogs.length > 0 && (
                      <p className="text-center text-sm text-[#666666] py-4">此角色無稽核記錄</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-[#666666] border border-dashed border-[#333333] rounded-lg min-h-[300px]">
              <div className="text-center">
                <Shield size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">選擇角色以管理權限</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
              <h3 className="font-semibold text-white text-sm">
                {isEditMode ? '編輯角色' : '新增角色'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#999999] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1">
                  角色名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. maintenance_manager"
                  className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1">說明</label>
                <textarea
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  rows={2}
                  placeholder="角色職責說明..."
                  className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1 flex items-center gap-1">
                  <GitBranch size={11} />
                  繼承父角色（選填）
                </label>
                <select
                  value={roleForm.parent_role_id}
                  onChange={e => setRoleForm({ ...roleForm, parent_role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
                >
                  <option value="">不繼承</option>
                  {roles
                    .filter(r => r.id !== roleForm.id)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#333333] text-[#999999] hover:bg-[#333333] text-sm"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateOrUpdate}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm"
                >
                  {isEditMode ? '更新角色' : '建立角色'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
