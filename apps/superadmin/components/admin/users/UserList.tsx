'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { User, Plus } from 'lucide-react';
import { Search } from 'lucide-react';
import type { IAMUser } from '@/app/superadmin/users/actions';
import { addUserToGroup, removeUserFromGroup } from '@/app/superadmin/users/actions';

type GroupOption = { id: string; name: string };

export function UserList({
  initialUsers,
  availableGroups,
}: {
  initialUsers: IAMUser[];
  availableGroups: GroupOption[];
}) {
  const [data] = useState<IAMUser[]>(initialUsers);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<IAMUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(availableGroups[0]?.id || '');

  const handleAddGroup = async () => {
    if (!selectedUser || !selectedGroupId) return;
    const result = await addUserToGroup(selectedUser.id, selectedGroupId);
    if (result.success) window.location.reload();
    else alert(result.message);
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
      cell: (info) => (
        <div className="flex items-center gap-2">
          <div className="bg-bg-secondary p-2 rounded-full text-text-secondary">
            <User size={16} />
          </div>
          <span className="font-medium text-text-primary">{info.getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'groups',
      header: 'Assigned Groups',
      cell: (info) => (
        <div className="flex flex-wrap gap-1 items-center">
          {(info.getValue() as string[]).map((group) => (
            <span
              key={group}
              className="group relative px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 flex items-center gap-1"
            >
              {group}
              <button
                onClick={() => handleRemoveGroup(info.row.original.id, group)}
                className="hover:text-red-400 hidden group-hover:inline-block ml-1"
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
            className="p-1 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-accent transition-colors"
            title="Assign to Group"
          >
            <Plus size={14} />
          </button>
        </div>
      ),
    },
    {
      id: 'id',
      accessorKey: 'id',
      header: 'User ID',
      cell: (info) => (
        <span className="text-xs text-text-muted font-mono">{(info.getValue() as string).slice(0, 8)}...</span>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-bg-secondary border border-border-default p-2 rounded-lg max-w-sm">
        <Search size={18} className="text-text-secondary" />
        <input
          placeholder="Search users..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="outline-none text-sm w-full bg-transparent text-text-primary placeholder-text-muted"
        />
      </div>
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-tertiary border-b border-border-default">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-6 py-3 font-medium text-text-secondary">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-default">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-bg-tertiary/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 text-text-primary">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-border-default flex items-center justify-between text-sm text-text-secondary">
          <div>Showing {table.getRowModel().rows.length} of {initialUsers.length}</div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-border-default rounded hover:bg-bg-secondary disabled:opacity-50 text-text-primary"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border border-border-default rounded hover:bg-bg-secondary disabled:opacity-50 text-text-primary"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Assign Group to User</h3>
            <p className="text-text-secondary mb-4 text-sm">
              User: <span className="font-mono bg-bg-tertiary px-1 text-text-primary">{selectedUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-text-secondary mb-2">Select Group</label>
            <select
              className="w-full border border-border-default rounded-md p-2 mb-6 bg-bg-primary text-text-primary"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroup}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-md"
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
