'use client';

import { useState, useEffect } from 'react';
import { getUsers, getAllGroups } from '@/app/superadmin/users/actions';
import { UserList } from '@/components/admin/users/UserList';
import { InviteUserModal } from '@/components/admin/users/InviteUserModal';
import type { IAMUser } from '@/app/superadmin/users/actions';
import { IAMLayoutControls } from './LayoutControls';

type GroupOption = { id: string; name: string };

export function UsersTab() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [usersData, groupsData, auditData] = await Promise.all([
          getUsers(),
          getAllGroups(),
          fetch('/api/iam/audit')
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null),
        ]);
        setUsers(usersData);
        setGroups(groupsData);
        if (auditData?.stats?.activeUsers != null) {
          setOnlineUsersCount(auditData.stats.activeUsers as number);
        }
      } catch (error) {
        console.error('Failed to load users data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        載入中...
      </div>
    );
  }

  const totalUsers = users.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <IAMLayoutControls />
          <div className="flex items-center gap-4">
            <div className="text-xs text-[#999999]">
              <span className="font-medium text-white">
                Total Users: {totalUsers}
              </span>
              <span className="mx-1 text-[#555555]">/</span>
              <span className="font-medium text-green-400">
                Online Users:{' '}
                {onlineUsersCount != null ? onlineUsersCount : '—'}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#2A2A2A] text-white border border-[#333333] rounded-md hover:bg-[#333333] transition-colors text-sm">
                匯出用戶資料
              </button>
              <InviteUserModal />
            </div>
          </div>
        </div>
      </div>
      <UserList initialUsers={users} availableGroups={groups} />
    </div>
  );
}
