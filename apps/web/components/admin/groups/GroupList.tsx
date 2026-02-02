'use client';

import { useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnDef
} from '@tanstack/react-table';
import { Users, Shield, Edit, Trash2 } from 'lucide-react';

import { EditGroupModal } from './EditGroupModal';

// Define the shape of our Group data
type Group = {
    id: string;
    name: string;
    description: string;
    member_count: number;
    roles: string[];
    is_system_managed: boolean;
};


interface GroupListProps {
    initialGroups: Group[];
}

export function GroupList({ initialGroups }: GroupListProps) {
    const [data, setData] = useState<Group[]>(initialGroups);

    const columns: ColumnDef<Group>[] = [
        {
            accessorKey: 'name',
            header: 'Group Name',
            cell: info => <span className="font-semibold text-gray-900">{info.getValue() as string}</span>
        },
        {
            accessorKey: 'description',
            header: 'Description',
        },
        {
            accessorKey: 'member_count',
            header: 'Members',
            cell: info => (
                <div className="flex items-center gap-1 text-gray-600">
                    <Users size={16} />
                    <span>{info.getValue() as number}</span>
                </div>
            )
        },
        {
            accessorKey: 'roles',
            header: 'Attached Roles',
            cell: info => (
                <div className="flex flex-wrap gap-1">
                    {(info.getValue() as string[]).map(role => (
                        <span key={role} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                            <Shield size={10} />
                            {role}
                        </span>
                    ))}
                </div>
            )
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: info => {
                const isSystem = info.row.original.is_system_managed;
                return (
                    <div className="flex gap-2">
                        <EditGroupModal group={info.row.original} />
                        {!isSystem && (
                            <button className="p-1 hover:bg-red-50 rounded text-red-600">
                                <Trash2 size={16} />
                            </button>
                        )}
                        {isSystem && <span className="text-xs text-gray-400 italic py-1">System</span>}
                    </div>
                )
            }
        }
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
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
        </div>
    );
}
