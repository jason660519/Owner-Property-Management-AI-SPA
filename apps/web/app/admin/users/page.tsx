import { getUsers, getAllGroups } from './actions';
import { UserList } from '@/components/admin/users/UserList';
import { InviteUserModal } from '@/components/admin/users/InviteUserModal';

export default async function UsersPage() {
    const users = await getUsers();
    const groups = await getAllGroups();

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Assign users to groups to grant effective permissions.</p>
                </div>
                <InviteUserModal />
            </div>

            <UserList initialUsers={users} availableGroups={groups} />
        </div>
    );
}
