'use client';

import { useState, useEffect } from 'react';
import { Edit, X, Loader2, Shield } from 'lucide-react';
import { updateGroup, assignGroupRoles, getRoles } from '@/app/superadmin/groups/actions';

type Group = {
  id: string;
  name: string;
  description: string | null;
  roles: string[];
};

type Role = { id: string; name: string; description: string | null };

export function EditGroupModal({ group }: { group: Group }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getRoles()
        .then((allRoles) => {
          setRoles(allRoles);
          const initialRoleIds = allRoles
            .filter((r) => group.roles.includes(r.name))
            .map((r) => r.id);
          setSelectedRoles(initialRoleIds);
        })
        .catch(console.error);
    }
  }, [isOpen, group.roles]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    try {
      const updateResult = await updateGroup(formData);
      if (updateResult?.error) throw new Error(updateResult.error);
      const roleResult = await assignGroupRoles(group.id, selectedRoles);
      if (roleResult?.error) throw new Error(roleResult.error);
      setIsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-1 hover:bg-[#333333] rounded text-[#999999] hover:text-white transition-colors"
        title="Edit Group"
      >
        <Edit size={16} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333] flex-shrink-0">
          <h3 className="font-semibold text-white">Edit Permission Group</h3>
          <button onClick={() => setIsOpen(false)} className="text-[#999999] hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form action={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/20 text-red-400 text-sm p-3 rounded-md border border-red-500/30 mb-4">
              {error}
            </div>
          )}
          <input type="hidden" name="id" value={group.id} />
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#999999] mb-1">
                Group Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={group.name}
                required
                className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[#999999] mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={group.description || ''}
                rows={2}
                className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white resize-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#999999] mb-2">
                Assigned Roles & Permissions
              </label>
              <div className="border border-[#333333] rounded-md divide-y divide-[#333333] max-h-60 overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="p-4 text-center text-[#666666] text-sm">Loading roles...</div>
                ) : (
                  roles.map((role) => (
                    <div
                      key={role.id}
                      className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                        selectedRoles.includes(role.id) ? 'bg-[#7C3AED]/20' : 'hover:bg-[#333333]/50'
                      }`}
                      onClick={() => toggleRole(role.id)}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center ${
                          selectedRoles.includes(role.id) ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#666666]'
                        }`}
                      >
                        {selectedRoles.includes(role.id) && (
                          <Shield size={10} className="text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{role.name}</div>
                        <div className="text-xs text-[#666666]">{role.description}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-[#666666] mt-1">
                Select the roles that members of this group should inherit.
              </p>
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#333333] flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-[#999999] border border-[#333333] rounded-md hover:bg-[#333333]"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form[action]') as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-md hover:bg-[#6D28D9] flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
