// Multi-role portal — shown when a user holds more than one role.
// Lets them pick which dashboard to enter.
// Same concept as apps/web portal but English copy + AU role labels.

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface RoleOption {
  role: string;
  label: string;
  href: string;
  description: string;
}

const ROLE_MAP: Record<string, Omit<RoleOption, 'role'>> = {
  landlord:          { label: 'Landlord',          href: '/landlord/dashboard',             description: 'Manage your rental and sale properties' },
  agent:             { label: 'Real Estate Agent',  href: '/agent/dashboard',                description: 'Manage listings, leads and clients' },
  potential_tenant:  { label: 'Tenant (searching)', href: '/tenant/potential/dashboard',     description: 'Find properties and submit applications' },
  contracted_tenant: { label: 'Tenant (leased)',    href: '/tenant/contracted/dashboard',    description: 'View your lease, pay rent, log maintenance' },
  tenant:            { label: 'Tenant',             href: '/tenant/contracted/dashboard',    description: 'View your lease and property' },
  potential_buyer:   { label: 'Buyer (searching)',  href: '/buyer/potential/dashboard',      description: 'Search and track purchase opportunities' },
  contracted_buyer:  { label: 'Buyer (contracted)', href: '/buyer/contracted/dashboard',     description: 'Track your purchase to settlement' },
  buyer:             { label: 'Buyer',              href: '/buyer/contracted/dashboard',     description: 'Track your property purchase' },
  service_provider:  { label: 'Service Provider',   href: '/service-provider/dashboard',     description: 'Manage job requests and quotes' },
  vendor:            { label: 'Service Provider',   href: '/service-provider/dashboard',     description: 'Manage job requests and quotes' },
};

export default function PortalPage() {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data: roleRows } = await supabase.rpc('get_user_roles', {
        lookup_user_id: user.id,
      });
      const iamRoles: string[] = Array.isArray(roleRows)
        ? roleRows.map((r: { role_name: string }) => r.role_name)
        : [];

      // If only one role, skip portal and go straight to dashboard
      const options = iamRoles
        .filter((r) => r !== 'super_admin' && ROLE_MAP[r])
        .map((r) => ({ role: r, ...ROLE_MAP[r] }));

      if (options.length === 1) {
        window.location.href = options[0].href;
        return;
      }
      setRoles(options);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <p className="text-text-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Choose your workspace</h1>
        <p className="text-text-muted text-sm mb-8">
          Your account has multiple roles. Select one to continue.
        </p>
        <div className="space-y-3">
          {roles.map((r) => (
            <a
              key={r.role}
              href={r.href}
              className="flex items-center justify-between p-4 rounded-xl border border-border-default bg-bg-secondary hover:border-accent hover:bg-accent-subtle transition-all group"
            >
              <div>
                <p className="font-medium text-text-primary group-hover:text-accent transition-colors">
                  {r.label}
                </p>
                <p className="text-sm text-text-muted mt-0.5">{r.description}</p>
              </div>
              <span className="text-text-muted group-hover:text-accent transition-colors text-lg">→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
