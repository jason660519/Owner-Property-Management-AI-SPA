import { getUsers, getAllGroups } from '../users/actions';
import { UserList } from '@/components/admin/users/UserList';
import { InviteUserModal } from '@/components/admin/users/InviteUserModal';
import { DashboardLayout } from '@/components/dashboard';
import Link from 'next/link';

const BASE = '/superadmin';

export default async function SuperadminUsersPage() {
  const users = await getUsers();
  const groups = await getAllGroups();

  return (
    <DashboardLayout
      pageTitle="用戶管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員', href: `${BASE}/dashboard` },
        { label: '用戶管理' },
      ]}
      greeting="管理系統用戶與權限"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <p className="text-[#999999] mt-1">Assign users to groups to grant effective permissions.</p>
        </div>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#2A2A2A] text-white border border-[#333333] rounded-md hover:bg-[#333333] transition-colors text-sm">
                匯出用戶資料
            </button>
            <InviteUserModal />
        </div>
      </div>
      <UserList initialUsers={users} availableGroups={groups} />
      <div className="mt-6">
        <Link href={`${BASE}/dashboard`} className="text-[#7C3AED] hover:underline text-sm">
          ← 返回儀表板
        </Link>
      </div>
    </DashboardLayout>
  );
}
