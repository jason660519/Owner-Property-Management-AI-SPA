'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Check, 
  Clock, 
  User, 
  Activity,
  AlertCircle
} from 'lucide-react';

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
    { id: '1', name: 'Super Admin', description: 'Full access to all system resources' },
    { id: '2', name: 'Landlord', description: 'Manage owned properties and tenants' },
  ]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>('1');
  const [permissions, setPermissions] = useState<Record<string, Record<string, Action[]>>>({
    '1': {
      'Properties': ['create', 'read', 'update', 'delete'],
      'Users': ['create', 'read', 'update', 'delete'],
      'Contracts': ['create', 'read', 'update', 'delete'],
      'Reports': ['create', 'read', 'update', 'delete'],
    },
    '2': {
      'Properties': ['read', 'update'],
      'Contracts': ['read'],
    }
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      user: 'System Admin',
      action: 'System Init',
      details: 'RBAC module initialized'
    }
  ]);

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
    <div className="min-h-screen bg-bg-primary font-primary text-text-primary p-6 lg:p-10 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-DEFAULT pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-brand-DEFAULT" />
            RBAC Access Control
          </h1>
          <p className="text-text-secondary mt-2 text-lg">Manage roles, permissions, and security policies.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-DEFAULT hover:bg-brand-alt text-white px-6 py-3 rounded-md font-medium transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-DEFAULT/20"
        >
          <Plus className="w-5 h-5" />
          Create New Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Role List Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-bg-secondary border-border-DEFAULT shadow-xl overflow-hidden h-full">
            <CardHeader className="bg-bg-tertiary/30 border-b border-border-DEFAULT p-6">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-brand-light" />
                Role Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {roles.map(role => (
                <div 
                  key={role.id} 
                  className={`group relative p-4 rounded-base cursor-pointer transition-all duration-200 border ${
                    selectedRoleId === role.id 
                      ? 'bg-brand-DEFAULT/10 border-brand-DEFAULT shadow-[0_0_15px_rgba(112,59,247,0.15)]' 
                      : 'bg-bg-tertiary/20 border-transparent hover:bg-bg-tertiary hover:border-border-subtle'
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-semibold text-lg ${selectedRoleId === role.id ? 'text-brand-light' : 'text-white'}`}>
                        {role.name}
                      </h4>
                      <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                    <button 
                      className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-text-muted hover:text-red-500 ${selectedRoleId === role.id ? 'opacity-100' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id, role.name);
                      }}
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedRoleId === role.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-DEFAULT rounded-l-base"></div>
                  )}
                </div>
              ))}
              
              <div 
                className="p-4 rounded-base border border-dashed border-border-subtle text-text-muted hover:text-brand-light hover:border-brand-DEFAULT/50 hover:bg-bg-tertiary/30 transition-all cursor-pointer flex items-center justify-center gap-2 h-20"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-5 h-5" />
                <span>Add Custom Role</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission Matrix Main Content */}
        <div className="lg:col-span-8">
          <Card className="bg-bg-secondary border-border-DEFAULT shadow-xl h-full flex flex-col">
            <CardHeader className="bg-bg-tertiary/30 border-b border-border-DEFAULT p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-light" />
                Permission Matrix
              </CardTitle>
              {selectedRoleId && (
                <span className="text-sm px-3 py-1 rounded-full bg-brand-DEFAULT/20 text-brand-light border border-brand-DEFAULT/30">
                  Configuring: <span className="font-bold">{roles.find(r => r.id === selectedRoleId)?.name}</span>
                </span>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {!selectedRoleId ? (
                <div className="flex flex-col items-center justify-center h-96 text-text-muted">
                  <Shield className="w-16 h-16 mb-4 text-bg-tertiary" />
                  <p className="text-lg">Select a role from the left to configure permissions.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-tertiary/50 border-b border-border-DEFAULT">
                        <th className="p-5 font-semibold text-text-secondary text-sm uppercase tracking-wider w-1/4">Resource</th>
                        {ACTIONS.map(action => (
                          <th key={action} className="p-5 font-semibold text-text-secondary text-sm uppercase tracking-wider text-center w-[18%]">
                            {action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-DEFAULT/50">
                      {RESOURCES.map((resource, idx) => (
                        <tr 
                          key={resource} 
                          className="hover:bg-bg-tertiary/20 transition-colors group"
                        >
                          <td className="p-5 font-medium text-white group-hover:text-brand-light transition-colors">
                            {resource}
                          </td>
                          {ACTIONS.map(action => {
                            const isGranted = isPermissionGranted(selectedRoleId, resource, action);
                            return (
                              <td key={action} className="p-5 text-center">
                                <label className="relative inline-flex items-center justify-center cursor-pointer group/checkbox">
                                  <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={isGranted}
                                    onChange={() => togglePermission(selectedRoleId, resource, action)}
                                  />
                                  <div className={`
                                    w-6 h-6 rounded border transition-all duration-200 flex items-center justify-center
                                    ${isGranted 
                                      ? 'bg-brand-DEFAULT border-brand-DEFAULT shadow-[0_0_10px_rgba(112,59,247,0.4)] scale-110' 
                                      : 'bg-bg-tertiary border-border-subtle group-hover/checkbox:border-brand-DEFAULT/50'}
                                  `}>
                                    {isGranted && <Check className="w-4 h-4 text-white stroke-[3]" />}
                                  </div>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="p-6 bg-bg-tertiary/10 border-t border-border-DEFAULT mt-auto">
                    <div className="flex items-start gap-3 text-sm text-text-muted bg-brand-DEFAULT/5 p-4 rounded-base border border-brand-DEFAULT/10">
                      <AlertCircle className="w-5 h-5 text-brand-DEFAULT shrink-0 mt-0.5" />
                      <p>
                        Changes are applied immediately. Ensure you review the audit log for all permission modifications. 
                        Some sensitive actions may require additional verification in production environment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audit Log Section */}
      <Card className="bg-bg-secondary border-border-DEFAULT shadow-xl">
        <CardHeader className="bg-bg-tertiary/30 border-b border-border-DEFAULT p-6">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-light" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {auditLogs.length === 0 ? (
               <div className="p-8 text-center text-text-muted italic">No activities recorded yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-tertiary/50 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="p-4 font-medium text-text-secondary w-48">Timestamp</th>
                    <th className="p-4 font-medium text-text-secondary w-48">User</th>
                    <th className="p-4 font-medium text-text-secondary w-48">Action</th>
                    <th className="p-4 font-medium text-text-secondary">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-DEFAULT/30">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-bg-tertiary/20 transition-colors">
                      <td className="p-4 text-text-muted flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </td>
                      <td className="p-4 text-brand-light font-medium">{log.user}</td>
                      <td className="p-4 text-white">
                        <span className="px-2 py-1 rounded-md bg-bg-tertiary border border-border-subtle text-xs uppercase tracking-wide">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-bg-secondary shadow-2xl border-border-DEFAULT ring-1 ring-border-subtle scale-100 animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-border-DEFAULT p-6">
              <CardTitle className="text-xl text-white">Create New Role</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                <div>
                  <label htmlFor="roleName" className="block text-sm font-medium text-text-secondary mb-2">Role Name</label>
                  <input
                    id="roleName"
                    type="text"
                    className="w-full px-4 py-3 bg-bg-tertiary border border-border-input rounded-base text-white placeholder-text-muted focus:outline-none focus:border-brand-DEFAULT focus:ring-1 focus:ring-brand-DEFAULT transition-all"
                    placeholder="e.g. Property Manager"
                    value={newRole.name}
                    onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="roleDesc" className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                  <textarea
                    id="roleDesc"
                    className="w-full px-4 py-3 bg-bg-tertiary border border-border-input rounded-base text-white placeholder-text-muted focus:outline-none focus:border-brand-DEFAULT focus:ring-1 focus:ring-brand-DEFAULT min-h-[100px] transition-all resize-none"
                    placeholder="Describe the responsibilities and access levels..."
                    value={newRole.description}
                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-border-DEFAULT">
                  <button 
                    className="px-5 py-2.5 rounded-md text-text-secondary hover:text-white hover:bg-bg-tertiary transition-colors"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-5 py-2.5 rounded-md bg-brand-DEFAULT text-white hover:bg-brand-alt shadow-lg shadow-brand-DEFAULT/20 transition-all hover:-translate-y-0.5"
                    onClick={handleCreateRole}
                  >
                    Save Role
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
