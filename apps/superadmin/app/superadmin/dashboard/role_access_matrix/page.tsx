'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Download, Upload, Plus, Check, X, 
  Trash2, Shield, AlertTriangle, Loader2, Menu 
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState
} from '@tanstack/react-table';

// --- Types ---

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface PermissionItem {
  id: string; // Permission ID
  permissionName: string;
  resourceId?: string;
  resourceName?: string; // e.g. "User Management"
  type: 'Function' | 'Table' | 'Page';
  code?: string; // for function
  tableName?: string; // for table
  path?: string; // for page
  accessLevel: string;
  lastUpdated: string;
}

interface AvailableResource {
  id: string; // Permission ID
  name: string;
  resourceName?: string;
  code?: string;
  tableName?: string;
  path?: string;
  type: 'Function' | 'Table' | 'Page';
}

// --- Components ---

export default function RoleAccessMatrixPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [availableResources, setAvailableResources] = useState<AvailableResource[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]); // permission IDs
  
  // Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // 1. Fetch Roles on Mount
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
          if (data.length > 0) setSelectedRoleId(data[0].id);
        } else {
            // Fallback for demo if API fails (e.g. DB not set up)
            console.warn("Failed to fetch roles, using mock.");
            setRoles([
                { id: 'super_admin', name: 'Super Admin' }, 
                { id: 'landlord', name: 'Landlord' }
            ]);
            setSelectedRoleId('super_admin');
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchRoles();
  }, []);

  // 2. Fetch Matrix for Selected Role
  const fetchMatrix = async (roleId: string) => {
    if (!roleId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/permissions/matrix?roleId=${roleId}`);
      if (res.ok) {
        const data = await res.json();
        // Flatten the response
        const flat: PermissionItem[] = [
          ...(data.functions || []).map((f: any) => ({ ...f, type: 'Function', resourceName: f.name })),
          ...(data.tables || []).map((t: any) => ({ ...t, type: 'Table', resourceName: t.name })),
          ...(data.pages || []).map((p: any) => ({ ...p, type: 'Page', resourceName: p.name })),
        ];
        setPermissions(flat);
      } else {
          // Mock data fallback
          if (roleId === 'super_admin') {
              setPermissions([
                  { id: 'p1', permissionName: 'View Dashboard', type: 'Page', path: '/dashboard', accessLevel: 'allow', lastUpdated: new Date().toISOString(), resourceName: 'Dashboard' },
                  { id: 'p2', permissionName: 'Export Users', type: 'Function', code: 'users.export', accessLevel: 'allow', lastUpdated: new Date().toISOString(), resourceName: 'Export Users' }
              ]);
          } else {
              setPermissions([]);
          }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix(selectedRoleId);
  }, [selectedRoleId]);

  // 3. Fetch Available Resources for Drawer
  const fetchAvailable = async () => {
    if (!selectedRoleId) return;
    setLoadingAvailable(true);
    try {
      const res = await fetch(`/api/permissions/available-resources?roleId=${selectedRoleId}`);
      if (res.ok) {
        const data = await res.json();
        const flat: AvailableResource[] = [
          ...(data.functions || []).map((f: any) => ({ ...f, type: 'Function' })),
          ...(data.tables || []).map((t: any) => ({ ...t, type: 'Table' })),
          ...(data.pages || []).map((p: any) => ({ ...p, type: 'Page' })),
        ];
        setAvailableResources(flat);
      } else {
          // Mock fallback
          setAvailableResources([
              { id: 'new1', name: 'Manage Settings', type: 'Page', path: '/settings', resourceName: 'Settings Page' },
              { id: 'new2', name: 'Delete Users', type: 'Function', code: 'users.delete', resourceName: 'Delete Users' }
          ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
    fetchAvailable();
    setSelectedToAdd([]);
  };

  // 4. Add Permissions
  const handleAddPermissions = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId, permissionIds: selectedToAdd })
      });
      if (res.ok) {
        setIsDrawerOpen(false);
        fetchMatrix(selectedRoleId); // Refresh table
        alert('Permissions added successfully');
      } else {
        alert('Failed to add permissions');
      }
    } catch (e) {
      console.error(e);
      alert('Error adding permissions');
    }
  };
  
  // 5. Delete Permission (Revoke)
  const handleRevoke = async (permissionId: string) => {
      if(!confirm('Are you sure you want to revoke this permission?')) return;
      try {
          const res = await fetch('/api/permissions', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roleId: selectedRoleId, permissionIds: [permissionId] })
          });
          if(res.ok) {
              fetchMatrix(selectedRoleId);
          } else {
              alert('Failed to revoke');
          }
      } catch (e) {
          console.error(e);
      }
  };

  // --- Table Config ---
  const columnHelper = createColumnHelper<PermissionItem>();

  const columns = useMemo(() => [
    columnHelper.accessor('type', {
      header: 'Type',
      cell: info => (
        <span className={clsx(
          "px-2 py-1 rounded-full text-xs font-medium",
          info.getValue() === 'Function' && "bg-purple-100 text-purple-700",
          info.getValue() === 'Table' && "bg-blue-100 text-blue-700",
          info.getValue() === 'Page' && "bg-green-100 text-green-700",
        )}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('resourceName', {
      header: 'Resource Name',
      cell: info => <span className="font-medium text-gray-900">{info.getValue()}</span>
    }),
    columnHelper.accessor(row => row.code || row.tableName || row.path || '-', {
      id: 'identifier',
      header: 'Identifier',
      cell: info => <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-600">{info.getValue()}</code>
    }),
    columnHelper.accessor('accessLevel', {
        header: 'Access',
        cell: info => (
            <div className="flex items-center gap-1 text-green-600">
                <Check size={14} /> <span>Authorized</span>
            </div>
        )
    }),
    columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: info => (
            <button 
                onClick={() => handleRevoke(info.row.original.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Revoke Permission"
            >
                <Trash2 size={16} />
            </button>
        )
    })
  ], [selectedRoleId]); // Re-create if role changes? Not strictly needed but safe

  const table = useReactTable({
    data: permissions,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
        pagination: { pageSize: 20 }
    }
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Access Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">Manage permissions for each role efficiently.</p>
        </div>
        
        {/* Role Selector */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Role:</span>
            <select 
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold text-gray-900 focus:ring-0 cursor-pointer min-w-[150px]"
            >
                {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search permissions..." 
                    value={globalFilter ?? ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <button 
                onClick={handleOpenDrawer}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
                <Plus size={16} /> Add Permission
            </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            {loading ? (
                <div className="p-12 flex justify-center items-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading matrix...
                </div>
            ) : permissions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <p>No permissions found for this role.</p>
                    <button onClick={handleOpenDrawer} className="text-indigo-600 hover:underline mt-2 text-sm">Add one now</button>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-6 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100" onClick={header.column.getToggleSortingHandler()}>
                                        <div className="flex items-center gap-1">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {{
                                                asc: ' 🔼',
                                                desc: ' 🔽',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-700">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        
        {/* Pagination */}
        {permissions.length > 0 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                <span>Showing {table.getRowModel().rows.length} of {permissions.length} permissions</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => table.previousPage()} 
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button 
                        onClick={() => table.nextPage()} 
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Add Permission Drawer (Right Side) */}
      {isDrawerOpen && (
        <>
            <div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" 
                onClick={() => setIsDrawerOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Add Permissions</h2>
                        <p className="text-sm text-gray-500">Select resources to grant access.</p>
                    </div>
                    <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {loadingAvailable ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                    ) : availableResources.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">All available resources are already assigned.</p>
                    ) : (
                        <div className="space-y-4">
                            {['Page', 'Function', 'Table'].map(type => {
                                const items = availableResources.filter(r => r.type === type);
                                if (items.length === 0) return null;
                                return (
                                    <div key={type}>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{type}s</h3>
                                        <div className="space-y-2">
                                            {items.map(item => (
                                                <label key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedToAdd.includes(item.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedToAdd([...selectedToAdd, item.id]);
                                                            else setSelectedToAdd(selectedToAdd.filter(id => id !== item.id));
                                                        }}
                                                    />
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.resourceName || item.name}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{item.path || item.code || item.tableName}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <button 
                        onClick={handleAddPermissions}
                        disabled={selectedToAdd.length === 0}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        Add {selectedToAdd.length} Permission{selectedToAdd.length !== 1 && 's'}
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
