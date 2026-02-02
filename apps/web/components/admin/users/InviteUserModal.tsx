'use client';

import { useState, useEffect } from 'react';
import { Mail, X, Loader2, UserPlus } from 'lucide-react';
import { inviteUser, getAllGroups } from '@/app/admin/users/actions';

type GroupOption = {
    id: string;
    name: string;
};

export function InviteUserModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadGroups();
            setSuccessMsg(null);
            setError(null);
            setEmail(''); // Reset email
            setSelectedGroupId(''); // Reset selected group
        }
    }, [isOpen]);

    async function loadGroups() {
        try {
            const data = await getAllGroups();
            setGroups(data);
        } catch (e) {
            console.error('Failed to load groups', e);
        }
    }

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const result = await inviteUser(formData);

            if (result?.error) {
                setError(result.error);
            } else {
                setSuccessMsg(result.warning || 'Invitation sent successfully!');
                if (!result.warning) {
                    // Close after short delay on success
                    setTimeout(() => setIsOpen(false), 1500);
                }
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
            >
                <UserPlus size={16} />
                Invite User
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Invite New User</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form action={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md border border-green-100">
                            {successMsg}
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="colleague@example.com"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-gray-900"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            The user will receive an email to set up their password.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-1">
                            Initial Group (Optional)
                        </label>
                        <select
                            id="groupId"
                            name="groupId"
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-gray-900"
                        >
                            <option value="">-- No Group --</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            {isLoading ? 'Sending Invite...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
