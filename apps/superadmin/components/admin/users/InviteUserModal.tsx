'use client';

import { useState, useEffect } from 'react';
import { Mail, X, Loader2, UserPlus, ShieldCheck } from 'lucide-react';
import { inviteUser, getAllGroups } from '@/app/superadmin/users/actions';

type GroupOption = { id: string; name: string };

/** Available roles for invitation */
const INVITE_ROLES = [
  { value: 'landlord', label: '房東 (Landlord)' },
  { value: 'contracted_tenant', label: '簽約租客 (Contracted Tenant)' },
  { value: 'potential_tenant', label: '潛在租客 (Potential Tenant)' },
  { value: 'contracted_buyer', label: '簽約買家 (Contracted Buyer)' },
  { value: 'potential_buyer', label: '潛在買家 (Potential Buyer)' },
  { value: 'agent', label: '仲介 (Agent)' },
  { value: 'service_provider', label: '服務提供者 (Service Provider)' },
  { value: 'super_admin', label: '超級管理員 (Super Admin)' },
] as const;

export function InviteUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('landlord');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSuccessMsg(null);
      setError(null);
      setEmail('');
      setSelectedRole('landlord');
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
        setSuccessMsg('Invitation sent successfully! The user will receive an email with an 8-digit invite code.');
        setTimeout(() => setIsOpen(false), 2500);
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
        className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium flex items-center gap-2"
      >
        <UserPlus size={16} />
        Invite User
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-default">
          <h3 className="font-semibold text-text-primary">Invite New User</h3>
          <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-primary">
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
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-text-muted" size={16} />
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-9 pr-3 py-2 border border-border-default rounded-md bg-bg-primary text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">
              An 8-digit invite code will be sent to this email address.
            </p>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-2.5 text-text-muted" size={16} />
              <select
                id="role"
                name="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-border-default rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="groupId" className="block text-sm font-medium text-text-secondary mb-1">
              Initial Group (Optional)
            </label>
            <select
              id="groupId"
              name="groupId"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-border-default rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover flex items-center gap-2 disabled:opacity-70"
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
