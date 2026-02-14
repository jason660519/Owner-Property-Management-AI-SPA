'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Users, Shield, Edit, Trash2 } from 'lucide-react';
import { EditGroupModal } from './EditGroupModal';

import type { GroupRow } from '@/app/superadmin/groups/actions';

type Group = GroupRow;

export function GroupList({ initialGroups }: { initialGroups: Group[] }) {
  const [data] = useState<Group[]>(initialGroups);

  const columns: ColumnDef<Group>[] = [
    {
      accessorKey: 'name',
      header: 'Group Name',
      cell: (info) => (
        <span className="font-semibold text-text-primary">{info.getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => (
        <span className="text-text-secondary">{(info.getValue() as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'member_count',
      header: 'Members',
      cell: (info) => (
        <div className="flex items-center gap-1 text-text-secondary">
          <Users size={16} />
          <span>{info.getValue() as number}</span>
        </div>
      ),
    },
    {
      accessorKey: 'roles',
      header: 'Attached Roles',
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {(info.getValue() as string[]).map((role) => (
            <span
              key={role}
              className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full flex items-center gap-1"
            >
              <Shield size={10} />
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const isSystem = info.row.original.is_system_managed;
        return (
          <div className="flex gap-2">
            <EditGroupModal group={info.row.original} />
            {!isSystem && (
              <button className="p-1 hover:bg-red-500/20 rounded text-red-400">
                <Trash2 size={16} />
              </button>
            )}
            {isSystem && (
              <span className="text-xs text-text-muted italic py-1">System</span>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
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
    </div>
  );
}
