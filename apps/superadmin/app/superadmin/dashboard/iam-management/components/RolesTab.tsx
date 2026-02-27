'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  Edit,
  X,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { IAMLayoutControls } from './LayoutControls';
import { useIamViewSettings } from './viewSettings';

import {
  getRoles,
  createRole,
  deleteRole,
  updateRole,
  getRbacAuditLogs,
  getAllRolePermissions,
  saveRolePermissions,
} from '../../rbac_access_control/actions';
import type { Role, RbacAuditLog } from '../../rbac_access_control/actions';
import { RESOURCE_DEFINITIONS, RESOURCES } from '@/lib/rbac/resources';
import type { ResourceId } from '@/lib/rbac/resources';
import type { PermissionScope } from '@/lib/rbac/permissions';

type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

const ACTIONS: Action[] = ['create', 'read', 'update', 'delete', 'manage'];

const ACTION_LABELS: Record<Action, string> = {
  create: 'C',
  read:   'R',
  update: 'U',
  delete: 'D',
  manage: 'M',
};

const ACTION_LOG_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  ASSIGN: 'warning',
  REVOKE: 'default',
};

const SCOPE_CYCLE: PermissionScope[] = ['all', 'own', 'assigned'];
const SCOPE_LABELS: Record<PermissionScope, string> = { all: 'all', own: 'own', assigned: 'assigned' };
const SCOPE_COLORS: Record<PermissionScope, string> = {
  all:      'bg-purple-700/40 text-purple-300 hover:bg-purple-700/60',
  own:      'bg-blue-700/40 text-blue-300 hover:bg-blue-700/60',
  assigned: 'bg-amber-700/40 text-amber-300 hover:bg-amber-700/60',
};

// Group resources by their group label for separator rows
const RESOURCE_GROUPS = RESOURCE_DEFINITIONS.reduce<{ group: string; resources: typeof RESOURCE_DEFINITIONS }[]>(
  (acc, res) => {
    const existing = acc.find(g => g.group === res.group);
    if (existing) existing.resources.push(res);
    else acc.push({ group: res.group, resources: [res] });
    return acc;
  },
  []
);

type PermissionMatrix = Record<string, Partial<Record<ResourceId, Action[]>>>;
type ScopeMatrix     = Record<string, Partial<Record<ResourceId, PermissionScope>>>;

export function RolesTab() {
  const [roles, setRoles]       = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [matrix, setMatrix]           = useState<PermissionMatrix>({});
  const [scopeMatrix, setScopeMatrix] = useState<ScopeMatrix>({});
  const [dirtyRoles, setDirtyRoles]   = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]       = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  // Audit log panel — shown below table, per role
  const [expandedAuditRole, setExpandedAuditRole] = useState<string | null>(null);
  const [auditLogs, setAuditLogs]                 = useState<RbacAuditLog[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode]   = useState(false);
  const [roleForm, setRoleForm]       = useState({ id: '', name: '', description: '' });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { freezeRowCount, frozenColCount } = useIamViewSettings();

  // Visual freeze-line indicators: thick border on the edge of the frozen area
  const FREEZE_LINE = '3px solid #555555';
  const isLastFrozenCol = (colIdx: number) => frozenColCount > 0 && colIdx === frozenColCount - 1;
  const colFreeze = (colIdx: number): React.CSSProperties =>
    isLastFrozenCol(colIdx) ? { borderRight: FREEZE_LINE } : {};
  const rowFreeze: React.CSSProperties =
    freezeRowCount === 1 ? { borderBottom: FREEZE_LINE } : {};

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permsData, logsData] = await Promise.all([
        getRoles(),
        getAllRolePermissions(),
        getRbacAuditLogs(30),
      ]);
      setRoles(rolesData);
      setAuditLogs(logsData);

      const m: PermissionMatrix = {};
      const s: ScopeMatrix = {};
      for (const p of permsData) {
        if (!m[p.role_id]) m[p.role_id] = {};
        if (!s[p.role_id]) s[p.role_id] = {};
        m[p.role_id][p.resource as ResourceId] = p.actions as Action[];
        s[p.role_id][p.resource as ResourceId] = p.scope ?? 'all';
      }
      setMatrix(m);
      setScopeMatrix(s);
      setDirtyRoles(new Set());
    } catch (err) {
      console.error('Failed to load IAM data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Priority order for role columns (front-to-back)
  const ROLE_ORDER = [
    'super_admin',
    'landlord',
    'buyer',
    'tenant',
    'unregister',
  ];

  // Search filters role columns, then sort by priority order
  const filteredRoles = roles
    .filter(
      r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const ai = ROLE_ORDER.indexOf(a.name);
      const bi = ROLE_ORDER.indexOf(b.name);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const togglePermission = (roleId: string, resource: ResourceId, action: Action) => {
    setMatrix(prev => {
      const rolePerms = prev[roleId] ?? {};
      const current = rolePerms[resource] ?? [];
      const updated = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [roleId]: { ...rolePerms, [resource]: updated } };
    });
    setDirtyRoles(prev => new Set(prev).add(roleId));
  };

  const cycleScope = (roleId: string, resource: ResourceId) => {
    setScopeMatrix(prev => {
      const current = prev[roleId]?.[resource] ?? 'all';
      const idx = SCOPE_CYCLE.indexOf(current);
      const next = SCOPE_CYCLE[(idx + 1) % SCOPE_CYCLE.length];
      return { ...prev, [roleId]: { ...(prev[roleId] ?? {}), [resource]: next } };
    });
    setDirtyRoles(prev => new Set(prev).add(roleId));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await Promise.all(
        Array.from(dirtyRoles).map(roleId => {
          const rows = RESOURCES.map(resource => ({
            resource,
            actions: matrix[roleId]?.[resource] ?? [],
            scope: scopeMatrix[roleId]?.[resource] ?? 'all',
          }));
          return saveRolePermissions(roleId, rows);
        })
      );
      setDirtyRoles(new Set());
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!roleForm.name) return;
    const formData = new FormData();
    formData.append('name', roleForm.name);
    formData.append('description', roleForm.description);
    if (isEditMode && roleForm.id) {
      formData.append('id', roleForm.id);
      await updateRole(formData);
    } else {
      await createRole(formData);
    }
    setIsModalOpen(false);
    setRoleForm({ id: '', name: '', description: '' });
    setIsEditMode(false);
    await loadAll();
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
    await loadAll();
  };

  const openEditModal = (role: Role) => {
    setRoleForm({ id: role.id, name: role.name, description: role.description });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setRoleForm({ id: '', name: '', description: '' });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Total columns = sticky resource col + category col + one col per visible role
  const totalCols = 2 + filteredRoles.length;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-none">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-[#7C3AED] w-5 h-5" />
            Roles &amp; Permissions Matrix
          </h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666] w-4 h-4" />
            <input
              type="text"
              placeholder="篩選角色名稱..."
              className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <IAMLayoutControls />
          {dirtyRoles.size > 0 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle size={12} />
              {dirtyRoles.size} 個角色有未儲存變更
            </span>
          )}
          <Button
            onClick={handleSaveAll}
            disabled={dirtyRoles.size === 0 || isSaving}
            className={`flex items-center gap-1.5 text-sm h-9 px-4 ${
              dirtyRoles.size > 0
                ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                : 'bg-[#2A2A2A] text-[#555555] cursor-not-allowed border border-[#333333]'
            }`}
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            儲存變更
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center gap-1.5 text-sm h-9 px-4"
          >
            <Plus size={14} />
            新增角色
          </Button>
        </div>
      </div>

      {/* Error banners */}
      {deleteError && (
        <div className="flex-none flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle size={14} />
          {deleteError}
        </div>
      )}
      {saveError && (
        <div className="flex-none flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle size={14} />
          儲存失敗：{saveError}
        </div>
      )}

      {/* Matrix Table — rows = resources, cols = roles */}
      {/* flex-1 min-h-0: bounded by the flex column parent so sticky top-0 on thead activates.
          overflow-hidden clips rounded corners. The inner overflow-auto div is the single
          scroll container handling both axes (no duplicate vertical scroll track). */}
      <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead className={freezeRowCount === 1 ? 'sticky top-0 z-30' : undefined}>
              <tr className="bg-[#1A1A1A]">
                {/* Top-left: resource label header */}
                <th
                  className={`${
                    frozenColCount >= 1 ? 'sticky left-0 z-20' : ''
                  } bg-[#1A1A1A] border-b border-r border-[#333333] px-4 py-3 text-left text-xs font-medium text-[#999999] w-44 min-w-[11rem]`}
                  style={{ ...colFreeze(0), ...rowFreeze }}
                >
                  資源名稱
                </th>

                {/* Resource category column — sticky when frozenColCount >= 2 (left-44 = width of resource col) */}
                <th
                  className={`${
                    frozenColCount >= 2 ? 'sticky left-44 z-20 bg-[#1A1A1A]' : ''
                  } border-b border-r border-[#333333] px-4 py-3 text-left text-xs font-medium text-[#999999] w-32 min-w-[8rem]`}
                  style={{ ...colFreeze(1), ...rowFreeze }}
                >
                  資源分類
                </th>

                {/* One column per role */}
                {isLoading ? (
                  <th className="px-6 py-3 border-b border-[#333333] text-center text-[#666666] text-xs">
                    載入中...
                  </th>
                ) : filteredRoles.length === 0 ? (
                  <th className="px-6 py-3 border-b border-[#333333] text-center text-[#666666] text-xs">
                    無符合的角色
                  </th>
                ) : (
                  filteredRoles.map(role => {
                    const isDirty = dirtyRoles.has(role.id);

                    return (
                      <th
                        key={role.id}
                        className={`px-3 py-2 border-b border-r border-[#333333] last:border-r-0 text-center whitespace-nowrap min-w-[8rem] ${
                          isDirty ? 'bg-purple-950/30' : 'bg-[#1A1A1A]'
                        }`}
                        style={rowFreeze}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {isDirty && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                              title="有未儲存變更"
                            />
                          )}
                          <span className="font-semibold text-white text-xs" title={role.name}>
                            {role.name}
                          </span>
                        </div>
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={totalCols} className="py-16 text-center text-[#666666] text-sm">
                    <RefreshCw size={16} className="animate-spin inline mr-2" />
                    載入中...
                  </td>
                </tr>
              ) : (
                RESOURCE_GROUPS.flatMap(({ group, resources }) =>
                  resources.map(res => (
                    <tr key={res.id} className="hover:bg-[#2E2E2E] transition-colors divide-x divide-[#2E2E2E]">
                      {/* Sticky resource label */}
                      <td
                        className={`${
                          frozenColCount >= 1 ? 'sticky left-0 z-10' : ''
                        } bg-[#2A2A2A] hover:bg-[#2E2E2E] px-4 py-2 border-r border-[#333333] whitespace-nowrap`}
                        style={colFreeze(0)}
                      >
                        <span className="text-white text-xs font-medium">{res.label}</span>
                      </td>

                      {/* Resource category (整合原本 PROPERTY/FINANCE/IAM/SYSTEM 分組列) */}
                      <td
                        className={`${
                          frozenColCount >= 2 ? 'sticky left-44 z-10 bg-[#2A2A2A]' : ''
                        } px-4 py-2 border-r border-[#333333] whitespace-nowrap`}
                        style={colFreeze(1)}
                      >
                        <span className="text-[10px] font-semibold text-[#7C3AED] uppercase tracking-widest">
                          {group}
                        </span>
                      </td>

                      {/* One permission cell per role */}
                      {filteredRoles.map(role => {
                        const grantedActions = matrix[role.id]?.[res.id] ?? [];
                        const hasManage = grantedActions.includes('manage');
                        // M implies all actions visually
                        const isEffective = (action: Action) =>
                          hasManage || grantedActions.includes(action);
                        const hasAny = grantedActions.length > 0;
                        const scope = scopeMatrix[role.id]?.[res.id] ?? 'all';
                        const isDirty = dirtyRoles.has(role.id);

                        return (
                          <td
                            key={role.id}
                            className={`px-3 py-2 text-center ${isDirty ? 'bg-purple-950/10' : ''}`}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              {ACTIONS.map(action => {
                                const effective = isEffective(action);
                                return (
                                  <button
                                    key={action}
                                    onClick={() => togglePermission(role.id, res.id, action)}
                                    title={`${role.name} · ${res.label} · ${action}`}
                                    className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${
                                      effective
                                        ? 'bg-[#7C3AED] text-white'
                                        : 'text-[#3A3A3A] hover:text-[#7C3AED]/60'
                                    }`}
                                  >
                                    {ACTION_LABELS[action]}
                                  </button>
                                );
                              })}
                            </div>
                            {hasAny && (
                              <button
                                onClick={() => cycleScope(role.id, res.id)}
                                title="點擊切換 scope：all → own → assigned"
                                className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${SCOPE_COLORS[scope]}`}
                              >
                                {SCOPE_LABELS[scope]}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex-none px-4 py-3 border-t border-[#333333] flex flex-wrap items-center gap-4 text-[10px] text-[#666666]">
          <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-[#7C3AED] text-white text-[10px] font-bold inline-flex items-center justify-center" />
            有權限
          </span>
          <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded text-[#3A3A3A] text-[10px] font-bold inline-flex items-center justify-center border border-[#3A3A3A]" />
            無權限
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            有未儲存變更
          </span>
          <span className="flex items-center gap-3 ml-2">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-700/40 text-purple-300">all</span>
              全部資料
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-700/40 text-blue-300">own</span>
              僅自己資料
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-700/40 text-amber-300">assigned</span>
              指派的資料
            </span>
          </span>
          <span className="ml-auto">
            C＝Create&nbsp;&nbsp;R＝Read&nbsp;&nbsp;U＝Update&nbsp;&nbsp;D＝Delete&nbsp;&nbsp;M＝Manage
          </span>
        </div>
      </div>

      {/* Audit log panel — shown below table, per role */}
      {expandedAuditRole && (() => {
        const role = roles.find(r => r.id === expandedAuditRole);
        if (!role) return null;
        const logs = auditLogs.filter(l => l.role_id === role.id || l.role_name === role.name);
        return (
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#999999] uppercase tracking-wider">
                  稽核日誌 — {role.name}
                </span>
                <span className="text-[10px] text-[#555555]">（最近 30 筆）</span>
              </div>
              <button
                onClick={() => setExpandedAuditRole(null)}
                className="text-[#555555] hover:text-white p-1 rounded hover:bg-[#333333]"
              >
                <X size={14} />
              </button>
            </div>
            {logs.length === 0 ? (
              <p className="text-xs text-[#555555]">此角色無稽核記錄</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-xs text-[#999999]">
                    <Badge variant={ACTION_LOG_VARIANT[log.action] ?? 'default'} className="text-[9px] flex-shrink-0">
                      {log.action}
                    </Badge>
                    <span className="text-white">{log.role_name}</span>
                    {log.actor_email && <span>by {log.actor_email}</span>}
                    <span className="ml-auto whitespace-nowrap text-[#555555]">
                      {new Date(log.created_at).toLocaleString('zh-TW')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
              <h3 className="font-semibold text-white text-sm">{isEditMode ? '編輯角色' : '新增角色'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#666666] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1.5">
                  角色名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. maintenance_manager"
                  className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1.5">說明</label>
                <textarea
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  rows={2}
                  placeholder="角色職責說明..."
                  className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
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
