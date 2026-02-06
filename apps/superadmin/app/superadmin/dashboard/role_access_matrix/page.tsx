'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Upload, Save, Check, X, Eye, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
type PermissionState = 'allow' | 'deny' | 'readonly';

interface Role {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  name: string;
  category: string;
}

interface PermissionMatrix {
  [roleId: string]: {
    [resourceId: string]: PermissionState;
  };
}

// --- Mock Data ---
const MOCK_ROLES: Role[] = [
  { id: 'admin', name: 'Super Admin' },
  { id: 'manager', name: 'Property Manager' },
  { id: 'landlord', name: 'Landlord' },
  { id: 'tenant', name: 'Tenant' },
  { id: 'viewer', name: 'Guest Viewer' },
];

const MOCK_RESOURCES: Resource[] = [
  { id: 'users', name: 'User Management', category: 'System' },
  { id: 'properties', name: 'Properties', category: 'Business' },
  { id: 'reports', name: 'Financial Reports', category: 'Business' },
  { id: 'settings', name: 'System Settings', category: 'System' },
  { id: 'logs', name: 'Audit Logs', category: 'System' },
];

const INITIAL_MATRIX: PermissionMatrix = {
  admin: { users: 'allow', properties: 'allow', reports: 'allow', settings: 'allow', logs: 'allow' },
  manager: { users: 'deny', properties: 'allow', reports: 'allow', settings: 'deny', logs: 'readonly' },
  landlord: { users: 'deny', properties: 'readonly', reports: 'readonly', settings: 'deny', logs: 'deny' },
  tenant: { users: 'deny', properties: 'readonly', reports: 'deny', settings: 'deny', logs: 'deny' },
  viewer: { users: 'deny', properties: 'readonly', reports: 'deny', settings: 'deny', logs: 'deny' },
};

export default function RoleAccessMatrixPage() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(INITIAL_MATRIX);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Filter resources based on search
  const filteredResources = useMemo(() => {
    return MOCK_RESOURCES.filter(res => 
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Toggle permission logic: allow -> readonly -> deny -> allow
  const togglePermission = (roleId: string, resourceId: string) => {
    setMatrix(prev => {
      const current = prev[roleId]?.[resourceId] || 'deny';
      let next: PermissionState = 'deny';
      if (current === 'allow') next = 'readonly';
      else if (current === 'readonly') next = 'deny';
      else next = 'allow';

      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [resourceId]: next
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const getPermissionIcon = (state: PermissionState) => {
    switch (state) {
      case 'allow': return <Check className="w-5 h-5 text-green-600" />;
      case 'readonly': return <Eye className="w-5 h-5 text-blue-500" />;
      case 'deny': return <X className="w-5 h-5 text-red-500" />;
      default: return <X className="w-5 h-5 text-gray-300" />;
    }
  };

  const getPermissionLabel = (state: PermissionState) => {
    switch (state) {
      case 'allow': return 'Allow';
      case 'readonly': return 'Read Only';
      case 'deny': return 'Deny';
      default: return 'Deny';
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matrix, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "role_access_matrix.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportCSV = () => {
    const header = ['Role', ...MOCK_RESOURCES.map(r => r.name)].join(',');
    const rows = MOCK_ROLES.map(role => {
      const perms = MOCK_RESOURCES.map(res => matrix[role.id]?.[res.id] || 'deny');
      return [role.name, ...perms].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "role_access_matrix.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleSaveClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmSave = () => {
    // API Call would go here
    console.log('Saving matrix:', matrix);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    alert('Permissions saved successfully!');
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Access Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">Manage role-based access control for system resources.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           <button 
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700"
            onClick={() => document.getElementById('import-input')?.click()}
           >
            <Upload className="w-4 h-4" /> Import
            <input id="import-input" type="file" className="hidden" accept=".json" onChange={(e) => {
               // Basic import logic (mock)
               const file = e.target.files?.[0];
               if(file) {
                 alert(`Importing ${file.name}... (Logic pending)`);
               }
            }} />
          </button>
          <button 
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={handleSaveClick}
            disabled={!hasUnsavedChanges}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              hasUnsavedChanges 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>

      {/* Search & Legend */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search resources..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" /> <span>Allow</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" /> <span>Read Only</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" /> <span>Deny</span>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 p-4 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                Role / Resource
              </th>
              {filteredResources.map(res => (
                <th key={res.id} className="bg-gray-50 border-b border-gray-200 p-4 text-center text-sm font-semibold text-gray-700 min-w-[120px]">
                  <div className="flex flex-col items-center">
                    <span>{res.name}</span>
                    <span className="text-xs text-gray-400 font-normal mt-1">{res.category}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_ROLES.map(role => (
              <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-4 text-sm font-medium text-gray-900">
                  {role.name}
                </td>
                {filteredResources.map(res => {
                  const state = matrix[role.id]?.[res.id] || 'deny';
                  return (
                    <td 
                      key={`${role.id}-${res.id}`} 
                      className="border-b border-gray-200 p-2 text-center"
                    >
                      <button
                        onClick={() => togglePermission(role.id, res.id)}
                        className={clsx(
                          "w-full h-10 rounded-md flex items-center justify-center transition-all duration-200 border",
                          state === 'allow' && "bg-green-50 border-green-200 hover:bg-green-100",
                          state === 'readonly' && "bg-blue-50 border-blue-200 hover:bg-blue-100",
                          state === 'deny' && "bg-red-50 border-red-200 hover:bg-red-100",
                        )}
                        title={`Current: ${getPermissionLabel(state)} - Click to change`}
                        data-testid={`cell-${role.name}-${res.name}`}
                      >
                        {getPermissionIcon(state)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredResources.length === 0 && (
              <tr>
                <td colSpan={MOCK_ROLES.length + 1} className="p-8 text-center text-gray-500">
                  No resources found matching "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Confirm Changes</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to save the changes to the permission matrix? This will immediately affect user access.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
