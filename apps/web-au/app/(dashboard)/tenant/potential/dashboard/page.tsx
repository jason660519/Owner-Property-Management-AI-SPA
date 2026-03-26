// Tenant (Potential) Dashboard — Australia
// AU-specific tenant concepts:
//   - Bond: paid upfront via state bond authority (RBA/RTBA/RTA etc.), typically 4 weeks
//   - Inspection: "open for inspection" (OFI) terminology
//   - Application: 100-point ID check, references, rental history
//   - Lease: typically 6 or 12 months fixed term, then periodic

export default function TenantPotentialDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Find a Property</h1>
        <p className="text-text-muted mt-1">
          Search listings, book inspections, and submit rental applications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickAction
          title="Browse Listings"
          description="Find available rentals in your area"
          href="/tenant/potential/properties"
          color="bg-blue-500/10 text-blue-400"
        />
        <QuickAction
          title="My Inspections"
          description="Upcoming open for inspections (OFIs)"
          href="/tenant/potential/viewings"
          color="bg-green-500/10 text-green-400"
        />
        <QuickAction
          title="My Applications"
          description="Track your rental applications"
          href="/tenant/potential/applications"
          color="bg-purple-500/10 text-purple-400"
        />
      </div>

      <div className="rounded-xl border border-border-default bg-bg-secondary p-6">
        <p className="text-text-muted text-sm">
          🚧 AU Tenant Dashboard — connect property search to Supabase with{' '}
          <code className="text-accent">region = &apos;AU&apos;</code> filter.
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  color,
}: {
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-border-default bg-bg-secondary p-5 hover:border-accent transition-colors group"
    >
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <span className="text-lg">→</span>
      </div>
      <h3 className="font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted">{description}</p>
    </a>
  );
}
