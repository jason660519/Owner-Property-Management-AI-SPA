import { getGroups } from './actions';
import { GroupList } from '@/components/admin/groups/GroupList';
import { CreateGroupModal } from '@/components/admin/groups/CreateGroupModal';

export default async function GroupsPage() {
    const groups = await getGroups();

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Permission Groups</h1>
                    <p className="text-gray-500 mt-1">Manage user access groups and their assigned roles.</p>
                </div>
                <CreateGroupModal />
            </div>

            <GroupList initialGroups={groups} />
        </div>
    );
}
