'use client';

import { useState, useEffect } from 'react';
import { Mail, X, Loader2, UserPlus } from 'lucide-react';
import { inviteUser, getAllGroups } from '@/app/superadmin/users/actions';

type GroupOption = { id: string; name: string };

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
      setSuccessMsg(null);
      setError(null);
      setEmail('');
      setSelectedGroupId('');
      getAllGroups().then(setGroups).catch(console.error);
    }
  }, [isOpen]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await inviteUser(formData);
      if (result?.error) setError(result.error);
      else {
        setSuccessMsg(result.warning || 'Invitation sent successfully!');
        if (!result.warning) setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors text-sm font-medium flex items-center gap-2"
      >
        <UserPlus size={16} />
        Invite User
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
          <h3 className="font-semibold text-white">Invite New User</h3>
          <button onClick={() => setIsOpen(false)} className="text-[#999999] hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form action={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 text-red-400 text-sm p-3 rounded-md border border-red-500/30">{error}</div>
          )}
          {successMsg && (
            <div className="bg-green-500/20 text-green-400 text-sm p-3 rounded-md border border-green-500/30">
              {successMsg}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#999999] mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-[#666666]" size={16} />
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-9 pr-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
            <p className="text-xs text-[#666666] mt-1">The user will receive an email to set up their password.</p>
          </div>
          <div>
            <label htmlFor="groupId" className="block text-sm font-medium text-[#999999] mb-1">
              Initial Group (Optional)
            </label>
            <select
              id="groupId"
              name="groupId"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white focus:ring-2 focus:ring-[#7C3AED]"
            >
              <option value="">-- No Group --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-[#999999] border border-[#333333] rounded-md hover:bg-[#333333]"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-md hover:bg-[#6D28D9] flex items-center gap-2 disabled:opacity-70"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
