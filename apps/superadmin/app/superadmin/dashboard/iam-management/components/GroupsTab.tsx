'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getGroups } from '@/app/superadmin/groups/actions';
import { GroupList } from '@/components/admin/groups/GroupList';
import { CreateGroupModal } from '@/components/admin/groups/CreateGroupModal';
import type { GroupRow } from '@/app/superadmin/groups/actions';
import { IAMLayoutControls } from './LayoutControls';

export function GroupsTab() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupRow[]>([]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        載入中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Permission Groups</h2>
          <p className="text-[#999999] mt-1 text-sm">
            Manage user access groups and their assigned roles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IAMLayoutControls />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchGroups}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border-default rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <CreateGroupModal />
          </div>
        </div>
      </div>
      <GroupList initialGroups={groups} />
    </div>
  );
}
