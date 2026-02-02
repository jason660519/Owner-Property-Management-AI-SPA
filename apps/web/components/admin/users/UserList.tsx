'use client';

import { useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnDef,
    getFilteredRowModel,
    getPaginationRowModel
} from '@tanstack/react-table';
import { User, ShieldPlus, Trash2, Search, Plus } from 'lucide-react';
import { IAMUser, addUserToGroup, removeUserFromGroup } from '@/app/admin/users/actions';

type GroupOption = {
    id: string;
    name: string;
};

interface UserListProps {
    initialUsers: IAMUser[];
    availableGroups: GroupOption[];
}

export function UserList({ initialUsers, availableGroups }: UserListProps) {
    const [data, setData] = useState<IAMUser[]>(initialUsers);
    const [globalFilter, setGlobalFilter] = useState('');

    // Simple "Add Group" Modal State
    const [selectedUser, setSelectedUser] = useState<IAMUser | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(availableGroups[0]?.id || '');

    const handleAddGroup = async () => {
        if (!selectedUser || !selectedGroupId) return;

        const result = await addUserToGroup(selectedUser.id, selectedGroupId);
        if (result.success) {
            // Optimistic update or refresh needed. For now, simple reload or we rely on Next.js revalidate
            window.location.reload();
        } else {
            alert(result.message);
        }
        setShowModal(false);
    };

    const handleRemoveGroup = async (userId: string, groupName: string) => {
        if (!confirm(`Remove user from ${groupName}?`)) return;
        await removeUserFromGroup(userId, groupName);
        window.location.reload();
    };

    const columns: ColumnDef<IAMUser>[] = [
        {
            accessorKey: 'email',
            header: 'User',
            cell: info => (
                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                        <User size={16} />
                    </div>
                    <span className="font-medium text-gray-900">{info.getValue() as string}</span>
                </div>
            )
        },
        {
            accessorKey: 'groups',
            header: 'Assigned Groups',
            cell: info => (
                <div className="flex flex-wrap gap-1 items-center">
                    {(info.getValue() as string[]).map(group => (
                        <span key={group} className="group relative px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-100 flex items-center gap-1 cursor-default">
                            {group}
                            <button
                                onClick={() => handleRemoveGroup(info.row.original.id, group)}
                                className="hover:text-red-500 hidden group-hover:inline-block ml-1"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={() => {
                            setSelectedUser(info.row.original);
                            setShowModal(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                        title="Assign to Group"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            )
        },
        {
            id: 'id',
            accessorKey: 'id',
            header: 'User ID',
            cell: info => <span className="text-xs text-gray-400 font-mono">{(info.getValue() as string).slice(0, 8)}...</span>
        }
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
    });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2 bg-white border p-2 rounded-lg max-w-sm">
                <Search size={18} className="text-gray-400" />
                <input
                    placeholder="Search items..."
                    value={globalFilter ?? ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                    className="outline-none text-sm w-full"
                />
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-gray-700">
                    <thead className="bg-gray-50 border-b">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-6 py-3 font-medium text-gray-900">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-6 py-4">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500">
                    <div>
                        Showing {table.getRowModel().rows.length} of {initialUsers.length}
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </button>
                        <button
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Dialog / Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Assign Group to User</h3>
                        <p className="text-gray-600 mb-4 text-sm">
                            User: <span className="font-mono bg-gray-100 px-1">{selectedUser.email}</span>
                        </p>

                        <label className="block text-sm font-medium mb-2">Select Group</label>
                        <select
                            className="w-full border rounded-md p-2 mb-6"
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                        >
                            {availableGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddGroup}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
