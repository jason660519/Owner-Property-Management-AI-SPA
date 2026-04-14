'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Search, RefreshCcw, User as UserIcon, AlertCircle, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import EnhancedTable from '@/components/ui/EnhancedTable';

import {
  getUsers,
  updateUser,
  deleteUser,
  inviteUser,
  IAMUser,
} from '../../../users/actions';
import { getRoles, Role } from '../../rbac_access_control/actions';

export function UsersTab() {
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userForm, setUserForm] = useState<Partial<IAMUser> & { newRoles: string[] }>({ 
    id: '', email: '', displayName: '', roles: [], newRoles: []
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { loadAllUsersAndRoles(); }, []);

  const loadAllUsersAndRoles = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to load users or roles:', err);
      setFormError('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.roles.some(roleId => roles.find(r => r.id === roleId)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [users, searchTerm, roles]);

  const handleCreateOrUpdateUser = async () => {
    if (!userForm.email || (!isEditMode && !userForm.displayName)) {
      setFormError('Email and Display Name are required.');
      return;
    }
    setFormError(null);
    
    let result: { success?: boolean; message?: string; error?: string };

    if (isEditMode && userForm.id) {
      // Update existing user
      const userToSave: Partial<IAMUser> = { 
        email: userForm.email,
        displayName: userForm.displayName,
        phone: userForm.phone,
        lineId: userForm.lineId,
        wechatId: userForm.wechatId,
        whatsapp: userForm.whatsapp,
        facebookUrl: userForm.facebookUrl,
        instagramUrl: userForm.instagramUrl,
        roles: userForm.newRoles,
      };
      result = await updateUser(userForm.id, userToSave);
    } else {
      // Invite new user (creation)
      const formData = new FormData();
      formData.append('email', userForm.email);
      formData.append('role', userForm.newRoles[0] || 'landlord'); // Assume first role for invite
      // Additional fields for inviteUser might be needed if they are mandatory
      result = await inviteUser(formData);
    }

    if (result.error || !result.success) {
      setFormError(result.error || result.message || 'An unknown error occurred.');
      return;
    }
    setIsModalOpen(false);
    setUserForm({ id: '', email: '', displayName: '', roles: [], newRoles: [] });
    setIsEditMode(false);
    await loadAllUsersAndRoles();
  };

  const handleDeleteUser = async (id: string, email: string) => {
    setDeleteError(null);
    if (!window.confirm(`確定要刪除使用者 "${email}"？此操作無法復原。`)) return;
    const result = await deleteUser(id);
    if (!result.success) {
      setDeleteError(result.message || 'An unknown error occurred during deletion.');
      setTimeout(() => setDeleteError(null), 5000);
      return;
    }
    await loadAllUsersAndRoles();
  };

  const openCreateModal = () => {
    setUserForm({ id: '', email: '', displayName: '', roles: [], newRoles: [] });
    setIsEditMode(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: IAMUser) => {
    setUserForm({
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? '',
      phone: user.phone ?? '',
      lineId: user.lineId ?? '',
      wechatId: user.wechatId ?? '',
      whatsapp: user.whatsapp ?? '',
      facebookUrl: user.facebookUrl ?? '',
      instagramUrl: user.instagramUrl ?? '',
      roles: user.roles, 
      newRoles: user.roles, 
    });
    setIsEditMode(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const columns: ColumnDef<IAMUser, unknown>[] = useMemo(() => [
    {
      id: 'email',
      header: '電子郵件',
      accessorFn: (row) => row.email,
      meta: { headerEn: 'Email', headerZh: '電子郵件' },
      cell: ({ row }) => (
        <span className="text-white text-xs font-medium whitespace-nowrap">{row.original.email}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'displayName',
      header: '姓名',
      accessorFn: (row) => row.displayName,
      meta: { headerEn: 'Name', headerZh: '姓名' },
      cell: ({ row }) => (
        <span className="text-white text-xs whitespace-nowrap">{row.original.displayName || 'N/A'}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'roles',
      header: '角色',
      accessorFn: (row) => row.roles.map(roleId => roles.find(r => r.id === roleId)?.name || roleId).join(', '),
      meta: { headerEn: 'Roles', headerZh: '角色' },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map(roleId => {
            const role = roles.find(r => r.id === roleId);
            return role ? (
              <span key={roleId} className="px-2 py-0.5 rounded-full text-[10px] bg-[#7C3AED]/20 text-[#7C3AED]">
                {role.name}
              </span>
            ) : null;
          })}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: 'createdAt',
      header: '建立時間',
      accessorFn: (row) => row.createdAt,
      meta: { headerEn: 'Created At', headerZh: '建立時間' },
      cell: ({ row }) => (
        <span className="text-white text-xs whitespace-nowrap">{row.original.createdAt ? new Date(row.original.createdAt).toLocaleString('zh-TW') : 'N/A'}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditModal(row.original)} className="text-xs">
            編輯
          </Button>
            <Button variant="danger" size="sm" onClick={() => void handleDeleteUser(row.original.id, row.original.email)} className="text-xs">
            刪除
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [roles]);

  const initialWidths = useMemo(() => [20, 20, 25, 20, 15], []); // Email, Name, Roles, Created At, Actions

  const extraToolbar = useMemo(() => (
    <div className="flex items-center gap-3 flex-shrink-0">
      <div className="relative w-52">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666] w-4 h-4" />
        <input
          type="text"
          placeholder="篩選使用者..."
          className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none text-white"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <Button
        onClick={openCreateModal}
        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center gap-1.5 text-sm h-9 px-4"
      >
        <Plus size={14} />
        新增使用者
      </Button>
    </div>
  ), [searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#666666] text-sm">
        <RefreshCcw size={16} className="animate-spin mr-2" />
        載入中...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center gap-2 flex-none">
        <UserIcon className="text-[#7C3AED] w-5 h-5" />
        <h2 className="text-xl font-bold text-white">使用者管理</h2>
      </div>

      {deleteError && (
        <div className="flex-none flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle size={14} />
          {deleteError}
        </div>
      )}

      <EnhancedTable<IAMUser>
        tableId="iam-users-management"
        columns={columns}
        data={filteredUsers}
        initialWidths={initialWidths}
        getSearchValue={(row) => `${row.email} ${row.displayName || ''} ${row.roles.map(roleId => roles.find(r => r.id === roleId)?.name || '').join(' ')}`}
        minWidth={1000}
        extraToolbar={extraToolbar}
      />

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
              <h3 className="font-semibold text-white text-sm">{isEditMode ? '編輯使用者' : '新增使用者'}</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="text-[#666666] hover:text-white"><X size={18} /></Button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-xs">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1.5">電子郵件 <span className="text-red-500">*</span></label>
                <input type="email" value={userForm.email || ''} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@example.com" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
              </div>
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">姓名 <span className="text-red-500">*</span></label>
                  <input type="text" value={userForm.displayName || ''} onChange={e => setUserForm({ ...userForm, displayName: e.target.value })}
                    placeholder="使用者名稱" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">電話</label>
                  <input type="text" value={userForm.phone || ''} onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="0912345678" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">Line ID</label>
                  <input type="text" value={userForm.lineId || ''} onChange={e => setUserForm({ ...userForm, lineId: e.target.value })}
                    placeholder="Line ID" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">WeChat ID</label>
                  <input type="text" value={userForm.wechatId || ''} onChange={e => setUserForm({ ...userForm, wechatId: e.target.value })}
                    placeholder="WeChat ID" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">WhatsApp</label>
                  <input type="text" value={userForm.whatsapp || ''} onChange={e => setUserForm({ ...userForm, whatsapp: e.target.value })}
                    placeholder="WhatsApp" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">Facebook URL</label>
                  <input type="text" value={userForm.facebookUrl || ''} onChange={e => setUserForm({ ...userForm, facebookUrl: e.target.value })}
                    placeholder="Facebook URL" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              {isEditMode && (
                <div>
                  <label className="block text-xs font-medium text-[#999999] mb-1.5">Instagram URL</label>
                  <input type="text" value={userForm.instagramUrl || ''} onChange={e => setUserForm({ ...userForm, instagramUrl: e.target.value })}
                    placeholder="Instagram URL" className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-1.5">角色</label>
                <select
                  multiple
                  value={userForm.newRoles}
                  onChange={e => setUserForm({ ...userForm, newRoles: Array.from(e.target.options).filter(option => option.selected).map(option => option.value) })}
                  className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none h-32"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-[#333333] text-[#999999] hover:bg-[#333333] text-sm">取消</Button>
                <Button onClick={handleCreateOrUpdateUser} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm">{isEditMode ? '更新使用者' : '建立使用者'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
