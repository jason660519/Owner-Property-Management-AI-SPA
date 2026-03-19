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
import { clsx } from 'clsx';
import type { IAMUser } from '@/app/superadmin/users/actions';
import {
  addUserToGroup,
  removeUserFromGroup,
  addRoleToUser,
  removeRoleFromUser,
  updateUserDisplayName,
  updateUserPhone,
  updateUserEmail,
  updateUserSocialContacts,
  type SocialContacts,
} from '@/app/superadmin/users/actions';
import { useIamViewSettings } from '@/app/superadmin/dashboard/iam-management/components/viewSettings';

type GroupOption = { id: string; name: string };

const COUNTRY_CODES = [
  { code: '+886', label: '🇹🇼 +886 台灣' },
  { code: '+86',  label: '🇨🇳 +86 中國' },
  { code: '+852', label: '🇭🇰 +852 香港' },
  { code: '+853', label: '🇲🇴 +853 澳門' },
  { code: '+81',  label: '🇯🇵 +81 日本' },
  { code: '+82',  label: '🇰🇷 +82 韓國' },
  { code: '+65',  label: '🇸🇬 +65 新加坡' },
  { code: '+60',  label: '🇲🇾 +60 馬來西亞' },
  { code: '+1',   label: '🇺🇸 +1 美國/加拿大' },
  { code: '+44',  label: '🇬🇧 +44 英國' },
  { code: '+61',  label: '🇦🇺 +61 澳洲' },
] as const;

type CountryCode = (typeof COUNTRY_CODES)[number]['code'];

// Parse a stored phone string (e.g. "+886912345678" or "0912345678") into parts.
function parsePhone(stored: string | null | undefined): { countryCode: CountryCode; localNumber: string } {
  if (!stored) return { countryCode: '+886', localNumber: '' };
  for (const { code } of COUNTRY_CODES) {
    if (stored.startsWith(code)) {
      return { countryCode: code as CountryCode, localNumber: stored.slice(code.length) };
    }
  }
  // Legacy local-only number (starts with 0) — assume TW
  return { countryCode: '+886', localNumber: stored };
}

// Build the canonical E.164-ish string to store. Strips leading 0 from local part.
function buildPhone(countryCode: string, localNumber: string): string {
  const local = localNumber.trim().replace(/^0+/, '');
  if (!local) return '';
  return `${countryCode}${local}`;
}

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
    phone: 180,
    social: 160,
    roles: 220,
    groups: 360,
    id: 200,
    createdAt: 220,
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [editPhoneCountry, setEditPhoneCountry] = useState<CountryCode>('+886');
  const [editPhoneLocal, setEditPhoneLocal] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [editSocial, setEditSocial] = useState<SocialContacts>({});

  const { freezeRowCount, frozenColCount } = useIamViewSettings();

  const getColumnBaseWidth = (columnId: string): number =>
    columnWidths[columnId] ?? 120;

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

  const handleOpenPhoneModal = (user: IAMUser) => {
    const { countryCode, localNumber } = parsePhone(user.phone);
    setSelectedUser(user);
    setEditPhoneCountry(countryCode);
    setEditPhoneLocal(localNumber);
    setShowPhoneModal(true);
  };

  const handleSavePhone = async () => {
    if (!selectedUser) return;
    const stored = buildPhone(editPhoneCountry, editPhoneLocal);
    const result = await updateUserPhone(selectedUser.id, stored);
    if (!result.success) {
      alert(result.message);
      return;
    }
    setShowPhoneModal(false);
    setSelectedUser(null);
    setEditPhoneCountry('+886');
    setEditPhoneLocal('');
    window.location.reload();
  };

  const handleOpenEmailModal = (user: IAMUser) => {
    setSelectedUser(user);
    setEditEmail(user.email);
    setEmailConfirm('');
    setShowEmailModal(true);
  };

  const handleSaveEmail = async () => {
    if (!selectedUser) return;
    if (editEmail !== emailConfirm) {
      alert('兩次輸入的 Email 不一致');
      return;
    }
    const result = await updateUserEmail(selectedUser.id, editEmail);
    if (!result.success) {
      alert(result.message);
      return;
    }
    setShowEmailModal(false);
    setSelectedUser(null);
    setEditEmail('');
    setEmailConfirm('');
    window.location.reload();
  };

  const handleOpenSocialModal = (user: IAMUser) => {
    setSelectedUser(user);
    setEditSocial({
      lineId:       user.lineId       ?? '',
      wechatId:     user.wechatId     ?? '',
      whatsapp:     user.whatsapp     ?? '',
      facebookUrl:  user.facebookUrl  ?? '',
      instagramUrl: user.instagramUrl ?? '',
    });
    setShowSocialModal(true);
  };

  const handleSaveSocial = async () => {
    if (!selectedUser) return;
    const result = await updateUserSocialContacts(selectedUser.id, editSocial);
    if (!result.success) {
      alert(result.message);
      return;
    }
    setShowSocialModal(false);
    setSelectedUser(null);
    setEditSocial({});
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
      cell: (info) => {
        const user = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="bg-bg-secondary p-2 rounded-full text-text-secondary">
              <User size={16} />
            </div>
            <span className="font-medium text-text-primary">{info.getValue() as string}</span>
            <button
              type="button"
              onClick={() => handleOpenEmailModal(user)}
              className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-accent text-xs"
              title="Edit email"
            >
              Edit
            </button>
          </div>
        );
      },
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
      id: 'phone',
      accessorKey: 'phone',
      header: 'Phone',
      cell: (info) => {
        const user = info.row.original;
        const { countryCode, localNumber } = parsePhone(user.phone);
        const display = user.phone
          ? `${countryCode} ${localNumber}`
          : null;
        return (
          <div className="flex items-center gap-2">
            {display
              ? <span className="text-text-primary font-mono text-xs">{display}</span>
              : <span className="text-text-muted">—</span>
            }
            <button
              type="button"
              onClick={() => handleOpenPhoneModal(user)}
              className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-accent text-xs"
              title="Edit phone"
            >
              Edit
            </button>
          </div>
        );
      },
    },
    {
      id: 'social',
      header: 'Social',
      cell: (info) => {
        const user = info.row.original;
        const active = [
          user.lineId       && 'LINE',
          user.wechatId     && 'WeChat',
          user.whatsapp     && 'WA',
          user.facebookUrl  && 'FB',
          user.instagramUrl && 'IG',
        ].filter(Boolean) as string[];
        return (
          <div className="flex items-center gap-2">
            {active.length > 0
              ? <span className="text-xs text-accent">{active.join(' · ')}</span>
              : <span className="text-text-muted text-xs">—</span>
            }
            <button
              type="button"
              onClick={() => handleOpenSocialModal(user)}
              className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-accent text-xs"
              title="Edit social contacts"
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

  const headerGroups = table.getHeaderGroups();
  const firstHeaderGroup = headerGroups[0];

  const FREEZE_LINE = '3px solid #555555';

  const frozenMeta: Record<
    string,
    { isFrozen: boolean; left: number; isLastFrozen: boolean }
  > = {};

  if (firstHeaderGroup) {
    let leftOffset = 0;
    firstHeaderGroup.headers.forEach((header, index) => {
      const columnId = header.column.id;
      const width = getColumnBaseWidth(columnId);
      const isFrozen = index < frozenColCount;

      if (isFrozen) {
        frozenMeta[columnId] = {
          isFrozen: true,
          left: leftOffset,
          isLastFrozen: index === frozenColCount - 1,
        };
        leftOffset += width;
      } else {
        frozenMeta[columnId] = {
          isFrozen: false,
          left: 0,
          isLastFrozen: false,
        };
      }
    });
  }

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
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden flex flex-col max-h-[600px]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm min-w-max">
            <thead
              className={clsx(
                'bg-bg-tertiary border-b border-border-default',
                freezeRowCount === 1 && 'sticky top-0 z-20'
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = frozenMeta[header.column.id];
                    const isFrozen = meta?.isFrozen ?? false;
                    const isLastFrozen = meta?.isLastFrozen ?? false;

                    return (
                      <th
                        key={header.id}
                        className={clsx(
                          'relative px-6 py-3 font-medium text-text-secondary border-r border-border-default last:border-r-0 bg-bg-tertiary',
                          isFrozen && 'sticky z-20'
                        )}
                        style={{
                          width: columnWidths[header.column.id] ?? undefined,
                          minWidth: 120,
                          ...(isFrozen
                            ? {
                                left: meta.left,
                                borderRight: isLastFrozen ? FREEZE_LINE : undefined,
                              }
                            : {}),
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          <div
                            onMouseDown={(event) =>
                              handleColumnResizeStart(header.column.id, event)
                            }
                            className="h-full w-1 cursor-col-resize hover:bg-border-default absolute top-0 right-0"
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border-default">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-bg-tertiary/30 transition-colors">
                  {row.getVisibleCells().map((cell) => {
                    const meta = frozenMeta[cell.column.id];
                    const isFrozen = meta?.isFrozen ?? false;
                    const isLastFrozen = meta?.isLastFrozen ?? false;

                    return (
                      <td
                        key={cell.id}
                        className={clsx(
                          'px-6 py-4 text-text-primary border-r border-border-default last:border-r-0 bg-bg-secondary',
                          isFrozen && 'sticky z-10'
                        )}
                        style={{
                          width: columnWidths[cell.column.id] ?? undefined,
                          minWidth: 120,
                          ...(isFrozen
                            ? {
                                left: meta.left,
                                borderRight: isLastFrozen ? FREEZE_LINE : undefined,
                              }
                            : {}),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      {showPhoneModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Edit Phone Number</h3>
            <p className="text-text-secondary mb-4 text-sm">
              User: <span className="font-mono bg-bg-tertiary px-1 text-text-primary">{selectedUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-text-secondary mb-2">手機號碼</label>
            <div className="flex gap-2 mb-2">
              <select
                value={editPhoneCountry}
                onChange={(e) => setEditPhoneCountry(e.target.value as CountryCode)}
                className="flex-none border border-border-default rounded-md px-2 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {COUNTRY_CODES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <input
                className="flex-1 border border-border-default rounded-md p-2 bg-bg-primary text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="912345678（勿加開頭 0）"
                value={editPhoneLocal}
                onChange={(e) => setEditPhoneLocal(e.target.value)}
                inputMode="tel"
              />
            </div>
            {editPhoneLocal.trim() && (
              <p className="text-xs text-text-muted mb-1">
                儲存為：<span className="font-mono text-accent">{buildPhone(editPhoneCountry, editPhoneLocal)}</span>
              </p>
            )}
            <p className="text-xs text-text-muted mb-6">
              號碼留空代表清除。此號碼將用於部落格 CTA 的 <span className="font-mono">tel:</span> 連結。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowPhoneModal(false); setSelectedUser(null); setEditPhoneCountry('+886'); setEditPhoneLocal(''); }}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhone}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showEmailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-1">Edit Email</h3>
            <p className="text-xs text-yellow-500 mb-4">⚠️ 此操作會直接修改 Supabase auth 登入憑證，請謹慎使用。</p>
            <p className="text-text-secondary mb-4 text-sm">
              Current: <span className="font-mono bg-bg-tertiary px-1 text-text-primary">{selectedUser.email}</span>
            </p>
            <label className="block text-sm font-medium text-text-secondary mb-2">New Email</label>
            <input
              className="w-full border border-border-default rounded-md p-2 mb-3 bg-bg-primary text-text-primary placeholder-text-muted"
              placeholder="new@example.com"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Email</label>
            <input
              className="w-full border border-border-default rounded-md p-2 mb-6 bg-bg-primary text-text-primary placeholder-text-muted"
              placeholder="再次輸入新 Email"
              type="email"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowEmailModal(false); setSelectedUser(null); setEditEmail(''); setEmailConfirm(''); }}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEmail}
                disabled={!editEmail.trim() || editEmail !== emailConfirm}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-md disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showSocialModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-1">Edit Social Contacts</h3>
            <p className="text-xs text-text-muted mb-4">
              設定後將自動同步至此用戶物件的部落格 CTA，讓潛在買家/租客多管道聯繫。
            </p>
            <p className="text-text-secondary mb-5 text-sm">
              User: <span className="font-mono bg-bg-tertiary px-1 text-text-primary">{selectedUser.email}</span>
            </p>
            <div className="space-y-3">
              {([
                { key: 'lineId',       label: 'LINE ID',      placeholder: 'e.g. my_line_id',               prefix: '💬' },
                { key: 'wechatId',     label: 'WeChat ID',    placeholder: 'e.g. wechat_username',          prefix: '💚' },
                { key: 'whatsapp',     label: 'WhatsApp',     placeholder: 'E.164 格式，e.g. +886912345678', prefix: '📱' },
                { key: 'facebookUrl',  label: 'Facebook',     placeholder: 'https://facebook.com/...',      prefix: '👤' },
                { key: 'instagramUrl', label: 'Instagram',    placeholder: 'https://instagram.com/...',     prefix: '📸' },
              ] as const).map(({ key, label, placeholder, prefix }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {prefix} {label}
                  </label>
                  <input
                    className="w-full border border-border-default rounded-md px-3 py-2 text-sm bg-bg-primary text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={placeholder}
                    value={(editSocial[key] as string) ?? ''}
                    onChange={(e) => setEditSocial(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-3 mb-5">留空代表清除該欄位。</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowSocialModal(false); setSelectedUser(null); setEditSocial({}); }}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSocial}
                className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-md"
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
