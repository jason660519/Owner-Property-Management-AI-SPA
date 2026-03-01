'use client';

import React, { useState } from 'react';
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
import {
  addUserToGroup,
  removeUserFromGroup,
  addRoleToUser,
  removeRoleFromUser,
  updateUserDisplayName,
} from '@/app/superadmin/users/actions';

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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    category: 140,
    email: 320,
    displayName: 220,
    roles: 220,
    groups: 360,
    id: 200,
    createdAt: 220,
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');

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

  const handleAddRole = async () => {
    if (!selectedUser || !newRole.trim()) return;
    const result = await addRoleToUser(selectedUser.id, newRole.trim());
    if (!result.success) {
      alert(result.message);
    } else {
      window.location.reload();
    }
    setShowRoleModal(false);
    setNewRole('');
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (!confirm(`Remove role "${role}" from this user?`)) return;
    const result = await removeRoleFromUser(userId, role);
    if (!result.success) {
      alert(result.message);
      return;
    }
    window.location.reload();
  };

  const handleOpenDisplayNameModal = (user: IAMUser) => {
    setSelectedUser(user);
    setEditDisplayName(user.displayName ?? user.email ?? '');
    setShowDisplayNameModal(true);
  };

  const handleSaveDisplayName = async () => {
    if (!selectedUser || !editDisplayName.trim()) return;
    const result = await updateUserDisplayName(selectedUser.id, editDisplayName.trim());
    if (!result.success) {
      alert(result.message);
      return;
    }
    setShowDisplayNameModal(false);
    setSelectedUser(null);
    setEditDisplayName('');
    window.location.reload();
  };

  const handleColumnResizeStart = (columnId: string, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth =
      columnWidths[columnId] ??
      (event.currentTarget.parentElement?.getBoundingClientRect().width ?? 0);

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const nextWidth = Math.max(120, startWidth + delta);
      setColumnWidths(prev => ({
        ...prev,
        [columnId]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const columns: ColumnDef<IAMUser>[] = [
    {
      id: 'category',
      header: '分類',
      cell: (info) => {
        const roles = info.row.original.roles || [];
        const isPostgresBuiltin = roles.some((role) =>
          role === 'postgres' || role.startsWith('pg_')
        );
        const label = isPostgresBuiltin ? 'Postgres內建' : '自定義';
        const baseClasses =
          'inline-flex items-center px-2 py-1 rounded-full text-xs border';
        return (
          <span
            className={
              label === '自定義'
                ? `${baseClasses} bg-purple-500/10 text-purple-300 border-purple-500/40`
                : `${baseClasses} bg-blue-500/10 text-blue-300 border-blue-500/40`
            }
          >
            {label}
          </span>
        );
      },
    },
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
      id: 'displayName',
      accessorKey: 'displayName',
      header: 'Display Name',
      cell: (info) => {
        const user = info.row.original;
        const name = user.displayName ?? user.email ?? '—';
        return (
          <div className="flex items-center gap-2">
            <span className="text-text-primary">{name}</span>
            <button
              type="button"
              onClick={() => handleOpenDisplayNameModal(user)}
              className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-accent text-xs"
              title="Edit display name"
            >
              Edit
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: 'roles',
      header: 'Assigned Role',
      cell: (info) => {
        const roles = (info.getValue() as string[]) || [];
        return (
          <div className="flex flex-wrap gap-1 items-center">
            {roles.length > 0 ? (
              roles.map((role) => (
                <span
                  key={role}
                  className="group relative px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30 flex items-center gap-1"
                >
                  {role}
                  <button
                    onClick={() => handleRemoveRole(info.row.original.id, role)}
                    className="hover:text-red-400 hidden group-hover:inline-block ml-1"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="text-text-muted text-xs">—</span>
            )}
            <button
              onClick={() => {
                setSelectedUser(info.row.original);
                setNewRole('');
                setShowRoleModal(true);
              }}
              className="p-1 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-accent transition-colors"
              title="Assign Role"
            >
              <Plus size={14} />
            </button>
          </div>
        );
      },
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
    {
      accessorKey: 'createdAt',
      header: 'Create Time',
      cell: (info) => {
        const value = info.getValue() as string | undefined;
        if (!value) {
          return <span className="text-xs text-text-muted">—</span>;
        }
        const date = new Date(value);
        const formatted = Number.isNaN(date.getTime())
          ? value
          : date.toLocaleString();
        return (
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {formatted}
          </span>
        );
      },
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
                  <th
                    key={header.id}
                    className="relative px-6 py-3 font-medium text-text-secondary border-r border-border-default last:border-r-0"
                    style={{
                      width: columnWidths[header.column.id] ?? undefined,
                      minWidth: 120,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <div
                        onMouseDown={(event) => handleColumnResizeStart(header.column.id, event)}
                        className="h-full w-1 cursor-col-resize hover:bg-border-default absolute top-0 right-0"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-default">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-bg-tertiary/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 text-text-primary border-r border-border-default last:border-r-0"
                    style={{
                      width: columnWidths[cell.column.id] ?? undefined,
                      minWidth: 120,
                    }}
                  >
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
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Assign Role to User</h3>
            <p className="text-text-secondary mb-4 text-sm">
              User: <span className="font-mono bg-bg-tertiary px-1 text-text-primary">{selectedUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-text-secondary mb-2">Role Name</label>
            <input
              className="w-full border border-border-default rounded-md p-2 mb-6 bg-bg-primary text-text-primary placeholder-text-muted"
              placeholder="e.g. landlord, potential_tenant"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setNewRole('');
                }}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                disabled={!newRole.trim()}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-md disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
      {showDisplayNameModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Edit Display Name</h3>
            <p className="text-text-secondary mb-4 text-sm">
              User: <span className="font-mono bg-bg-tertiary px-1 text-text-primary">{selectedUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
            <input
              className="w-full border border-border-default rounded-md p-2 mb-6 bg-bg-primary text-text-primary placeholder-text-muted"
              placeholder="e.g. Super_admin a0405"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDisplayNameModal(false);
                  setSelectedUser(null);
                  setEditDisplayName('');
                }}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDisplayName}
                disabled={!editDisplayName.trim()}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-md disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
