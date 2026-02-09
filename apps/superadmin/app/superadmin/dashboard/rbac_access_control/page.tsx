'use client';

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Search,
  Edit,
  X
} from 'lucide-react';
import { getRoles, createRole, deleteRole, updateRole } from './actions';

// Types
type Role = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

type Resource = 'Properties' | 'Users' | 'Contracts' | 'Reports' | 'Finance' | 'Logs' | 'Config';
type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

const RESOURCES: Resource[] = ['Properties', 'Users', 'Contracts', 'Reports', 'Finance', 'Logs', 'Config'];
const ACTIONS: Action[] = ['create', 'read', 'update', 'delete', 'manage'];

export default function RBACPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, Action[]>>>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: '', name: '', description: '' });

  // Fetch Roles
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const data = await getRoles();
      setRoles(data as Role[]);
      if (data && data.length > 0 && !selectedRole) {
        setSelectedRole(data[0] as Role);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrUpdate = async () => {
    if (!roleForm.name) return;
    
    const formData = new FormData();
    formData.append('name', roleForm.name);
    formData.append('description', roleForm.description);
    
    if (isEditMode && roleForm.id) {
        formData.append('id', roleForm.id);
        await updateRole(formData);
    } else {
        await createRole(formData);
    }
    
    setIsModalOpen(false);
    setRoleForm({ id: '', name: '', description: '' });
    setIsEditMode(false);
    loadRoles();
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete role "${name}"?`)) {
      await deleteRole(id);
      loadRoles();
      if (selectedRole?.id === id) setSelectedRole(null);
    }
  };

  const openEditModal = (role: Role) => {
    setRoleForm({ id: role.id, name: role.name, description: role.description });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setRoleForm({ id: '', name: '', description: '' });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Mock Permission Logic (In real app, this would fetch from iam_role_permissions table)
  const togglePermission = (roleId: string, resource: string, action: Action) => {
    // This is visual only for now, as DB schema for granular permissions wasn't requested in migration
    setPermissions(prev => {
      const rolePerms = prev[roleId] || {};
      const resourceActions = rolePerms[resource] || [];
      
      const newActions = resourceActions.includes(action)
        ? resourceActions.filter(a => a !== action)
        : [...resourceActions, action];
        
      return {
        ...prev,
        [roleId]: {
          ...rolePerms,
          [resource]: newActions
        }
      };
    });
  };

  return (
    <div className="p-8 bg-[#1A1A1A] min-h-screen text-white space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="text-[#7C3AED] w-8 h-8" />
            RBAC Access Control
          </h1>
          <p className="text-[#999999] mt-2">Manage system roles, permissions, and access policies.</p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center gap-2"
        >
          <Plus size={18} />
          Create New Role
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Role List (Sidebar) */}
        <div className="col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666666] w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search roles..." 
              className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {isLoading ? (
                <div className="text-center py-8 text-[#666666]">Loading roles...</div>
            ) : filteredRoles.map(role => (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all border ${
                  selectedRole?.id === role.id 
                    ? 'bg-[#2A2A2A] border-[#7C3AED]' 
                    : 'bg-[#2A2A2A] border-[#333333] hover:border-[#666666]'
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <div className="p-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">{role.name}</h3>
                    <p className="text-xs text-[#999999] mt-1 line-clamp-2">{role.description}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-[#666666]">
                      <Clock size={12} />
                      {new Date(role.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                     {/* Actions */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(role); }}
                        className="p-1.5 hover:bg-[#333333] rounded text-[#999999] hover:text-white"
                     >
                        <Edit size={14} />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}
                        className="p-1.5 hover:bg-red-500/20 rounded text-[#999999] hover:text-red-500"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Permission Matrix (Main Content) */}
        <div className="col-span-8">
          {selectedRole ? (
            <Card className="bg-[#2A2A2A] border-[#333333] h-full">
              <CardHeader className="border-b border-[#333333] pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                      <User className="text-[#7C3AED] w-5 h-5" />
                      {selectedRole.name}
                    </CardTitle>
                    <p className="text-sm text-[#999999] mt-1">{selectedRole.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs rounded-full border border-green-500/20">
                      Active
                    </span>
                    <span className="text-xs text-[#666666]">ID: {selectedRole.id}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Permission Matrix</h3>
                    <div className="text-xs text-[#666666] flex items-center gap-2">
                        <AlertCircle size={14} />
                        Changes are saved automatically
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#999999] uppercase bg-[#333333]">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Resource</th>
                        {ACTIONS.map(action => (
                          <th key={action} className="px-4 py-3 text-center">{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RESOURCES.map((resource, idx) => (
                        <tr key={resource} className="border-b border-[#333333] hover:bg-[#333333]/50">
                          <td className="px-4 py-4 font-medium text-white flex items-center gap-2">
                            {resource}
                          </td>
                          {ACTIONS.map(action => {
                            const isGranted = permissions[selectedRole.id]?.[resource]?.includes(action);
                            return (
                              <td key={`${resource}-${action}`} className="px-4 py-4 text-center">
                                <button
                                  onClick={() => togglePermission(selectedRole.id, resource, action)}
                                  className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mx-auto ${
                                    isGranted
                                      ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                      : 'bg-[#1A1A1A] border-[#666666] text-transparent hover:border-[#999999]'
                                  }`}
                                >
                                  <Check size={14} />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-[#666666] border border-dashed border-[#333333] rounded-lg">
              <div className="text-center">
                <Shield size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a role to manage permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
              <h3 className="font-semibold text-white">
                {isEditMode ? 'Edit Role' : 'Create New Role'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#999999] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#999999] mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                  placeholder="e.g. maintenance_manager"
                  className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999999] mb-1">
                  Description
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                  rows={3}
                  placeholder="Describe the role's responsibilities..."
                  className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                    variant="outline" 
                    onClick={() => setIsModalOpen(false)}
                    className="border-[#333333] text-[#999999] hover:bg-[#333333]"
                >
                  Cancel
                </Button>
                <Button 
                    onClick={handleCreateOrUpdate}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                >
                  {isEditMode ? 'Update Role' : 'Create Role'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
