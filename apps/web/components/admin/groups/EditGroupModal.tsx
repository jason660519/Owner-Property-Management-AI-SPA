'use client';

import { useState, useEffect } from 'react';
import { Edit, X, Loader2, Shield } from 'lucide-react';
import { updateGroup, assignGroupRoles, getRoles } from '@/app/admin/groups/actions';

type Group = {
    id: string;
    name: string;
    description: string;
    roles: string[];
};

type Role = {
    id: string;
    name: string;
    description: string;
};

export function EditGroupModal({ group }: { group: Group }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadRoles();
            // Initialize selected roles based on group names (We need IDs, so this is tricky without role mapping)
            // Since the group object only has role NAMES, we will map them after loading roles.
        }
    }, [isOpen]);

    async function loadRoles() {
        try {
            const allRoles = await getRoles();
            setRoles(allRoles);

            // Match existing roles by name to get their IDs
            const initialRoleIds = allRoles
                .filter(r => group.roles.includes(r.name))
                .map(r => r.id);
            setSelectedRoles(initialRoleIds);
        } catch (e) {
            console.error('Failed to load roles', e);
        }
    }

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Update Group Details
            const updateResult = await updateGroup(formData);
            if (updateResult?.error) {
                throw new Error(updateResult.error);
            }

            // 2. Update Role Assignments
            // Note: We need to pass the groupId and the array of selected role IDs
            const roleResult = await assignGroupRoles(group.id, selectedRoles);
            if (roleResult?.error) {
                throw new Error(roleResult.error);
            }

            setIsOpen(false);
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    const toggleRole = (roleId: string) => {
        setSelectedRoles(prev =>
            prev.includes(roleId)
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                title="Edit Group"
            >
                <Edit size={16} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50 flex-shrink-0">
                    <h3 className="font-semibold text-gray-900">Edit Permission Group</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form action={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100 mb-4">
                            {error}
                        </div>
                    )}

                    <input type="hidden" name="id" value={group.id} />

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Group Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                defaultValue={group.name}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-gray-900"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                defaultValue={group.description}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assigned Roles & Permissions
                            </label>
                            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                                {roles.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Loading roles...</div>
                                ) : (
                                    roles.map(role => (
                                        <div
                                            key={role.id}
                                            className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${selectedRoles.includes(role.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                            onClick={() => toggleRole(role.id)}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedRoles.includes(role.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                                                {selectedRoles.includes(role.id) && <Shield size={10} className="text-white" />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{role.name}</div>
                                                <div className="text-xs text-gray-500">{role.description}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Select the roles that members of this group should inherit.
                            </p>
                        </div>
                    </div>
                </form>

                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={(e) => {
                            // Trigger form submission manually since the button is outside the form tag
                            e.preventDefault();
                            const form = document.querySelector('form[action]') as HTMLFormElement;
                            if (form) form.requestSubmit();
                        }}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading && <Loader2 size={16} className="animate-spin" />}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
