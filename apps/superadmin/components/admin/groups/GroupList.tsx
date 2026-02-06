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
        <span className="font-semibold text-white">{info.getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => (
        <span className="text-[#999999]">{(info.getValue() as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'member_count',
      header: 'Members',
      cell: (info) => (
        <div className="flex items-center gap-1 text-[#999999]">
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
              className="px-2 py-0.5 bg-[#7C3AED]/20 text-[#A78BFA] text-xs rounded-full flex items-center gap-1"
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
              <span className="text-xs text-[#666666] italic py-1">System</span>
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
    <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#1F1F1F] border-b border-[#333333]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-6 py-3 font-medium text-[#999999]">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[#333333]">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#333333]/30 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-6 py-4 text-white">
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
