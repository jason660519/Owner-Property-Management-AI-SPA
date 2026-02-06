'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

// Types
type Role = {
  id: string;
  name: string;
  description: string;
};

type Resource = 'Properties' | 'Users' | 'Contracts' | 'Reports';
type Action = 'create' | 'read' | 'update' | 'delete';

type AuditLog = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
};

const RESOURCES: Resource[] = ['Properties', 'Users', 'Contracts', 'Reports'];
const ACTIONS: Action[] = ['create', 'read', 'update', 'delete'];

export default function RBACPage() {
  const [roles, setRoles] = useState<Role[]>([
    { id: '1', name: 'Super Admin', description: 'Full access to all resources' },
    { id: '2', name: 'Landlord', description: 'Manage owned properties' },
  ]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, Action[]>>>({
    '1': {
      'Properties': ['create', 'read', 'update', 'delete'],
      'Users': ['create', 'read', 'update', 'delete'],
    },
    '2': {
      'Properties': ['read', 'update'],
    }
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const addAuditLog = (action: string, details: string) => {
    const log: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      user: 'Current Admin',
      action,
      details
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleCreateRole = () => {
    if (!newRole.name) return;
    const newId = Date.now().toString();
    setRoles([...roles, { id: newId, ...newRole }]);
    setIsModalOpen(false);
    setNewRole({ name: '', description: '' });
    addAuditLog('Create Role', `Created role: ${newRole.name}`);
  };

  const handleDeleteRole = (id: string, name: string) => {
    // Mock Orphan Check
    const confirm = window.confirm(`Are you sure you want to delete role "${name}"? This action will be logged.`);
    if (confirm) {
      setRoles(roles.filter(r => r.id !== id));
      if (selectedRoleId === id) setSelectedRoleId(null);
      addAuditLog('Delete Role', `Deleted role: ${name}`);
    }
  };

  const togglePermission = (roleId: string, resource: string, action: Action) => {
    setPermissions(prev => {
      const rolePerms = prev[roleId] || {};
      const resourcePerms = rolePerms[resource] || [];
      
      let newResourcePerms;
      if (resourcePerms.includes(action)) {
        newResourcePerms = resourcePerms.filter(a => a !== action);
      } else {
        newResourcePerms = [...resourcePerms, action];
      }
      
      addAuditLog('Update Permission', `Role ${roleId}: Toggled ${action} on ${resource}`);

      return {
        ...prev,
        [roleId]: {
          ...rolePerms,
          [resource]: newResourcePerms
        }
      };
    });
  };

  const isPermissionGranted = (roleId: string, resource: string, action: Action) => {
    return permissions[roleId]?.[resource]?.includes(action) || false;
  };

  return (
    <div className="p-8 space-y-8 min-h-screen bg-[#0f172a]">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">RBAC Access Control</h1>
        <Button onClick={() => setIsModalOpen(true)}>Create Role</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map(role => (
                  <div 
                    key={role.id} 
                    className={`flex justify-between items-center p-4 rounded-lg cursor-pointer transition-colors ${selectedRoleId === role.id ? 'bg-[#7C3AED]/20 border border-[#7C3AED]' : 'bg-[#333333] border border-transparent hover:bg-[#404040]'}`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <div>
                      <h4 className="font-semibold text-white">{role.name}</h4>
                      <p className="text-sm text-gray-400 truncate max-w-[150px]">{role.description}</p>
                    </div>
                    <div className="space-x-2 flex">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-400 hover:text-red-300 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id, role.name);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Permission Matrix {selectedRoleId && `- ${roles.find(r => r.id === selectedRoleId)?.name}`}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedRoleId ? (
                <div className="text-gray-400 text-sm flex items-center justify-center h-64">
                  Select a role from the left to configure permissions.
                </div>
              ) : (
                <div className="border border-[#333333] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 bg-[#2A2A2A] p-4 font-semibold text-gray-200 border-b border-[#333333]">
                    <div>Resource</div>
                    {ACTIONS.map(action => (
                      <div key={action} className="text-center capitalize">{action}</div>
                    ))}
                  </div>
                  <div className="divide-y divide-[#333333]">
                    {RESOURCES.map(resource => (
                      <div key={resource} className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-[#2A2A2A]/50 transition-colors">
                        <div className="font-medium text-gray-300">{resource}</div>
                        {ACTIONS.map(action => (
                          <div key={action} className="flex justify-center">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded border-gray-600 bg-[#333333] text-[#7C3AED] focus:ring-[#7C3AED]"
                              checked={isPermissionGranted(selectedRoleId, resource, action)}
                              onChange={() => togglePermission(selectedRoleId, resource, action)}
                              aria-label={`${action} ${resource}`}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audit Log Section */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {auditLogs.length === 0 ? (
               <div className="text-gray-500 italic">No activities recorded yet.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex text-sm border-b border-[#333333] pb-2 last:border-0">
                  <span className="text-gray-500 w-24 flex-shrink-0">{log.timestamp}</span>
                  <span className="text-[#7C3AED] w-32 font-medium flex-shrink-0">{log.user}</span>
                  <span className="text-gray-300 w-32 font-medium flex-shrink-0">{log.action}</span>
                  <span className="text-gray-400">{log.details}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-[#1E1E1E] shadow-xl border-[#7C3AED]/20">
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="roleName" className="block text-sm font-medium text-gray-300 mb-1">Role Name</label>
                  <input
                    id="roleName"
                    type="text"
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                    placeholder="e.g. Property Manager"
                    value={newRole.name}
                    onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="roleDesc" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    id="roleDesc"
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] min-h-[100px]"
                    placeholder="Describe the responsibilities..."
                    value={newRole.description}
                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateRole}>Save Role</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
