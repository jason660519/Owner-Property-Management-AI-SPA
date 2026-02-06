import { getGroups } from '../groups/actions';
import { GroupList } from '@/components/admin/groups/GroupList';
import { CreateGroupModal } from '@/components/admin/groups/CreateGroupModal';
import { DashboardLayout } from '@/components/dashboard';
import Link from 'next/link';

const BASE = '/superadmin';

export default async function SuperadminGroupsPage() {
  const groups = await getGroups();

  return (
    <DashboardLayout
      pageTitle="權限群組"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員', href: `${BASE}/dashboard` },
        { label: '權限群組' },
      ]}
      greeting="管理用戶存取群組與角色"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Permission Groups</h2>
          <p className="text-[#999999] mt-1">Manage user access groups and their assigned roles.</p>
        </div>
        <CreateGroupModal />
      </div>
      <GroupList initialGroups={groups} />
      <div className="mt-6">
        <Link href={`${BASE}/dashboard`} className="text-[#7C3AED] hover:underline text-sm">
          ← 返回儀表板
        </Link>
      </div>
    </DashboardLayout>
  );
}
