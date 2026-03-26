// Buyer Dashboard — Australia
// AU-specific buyer concepts:
//   - Auction vs Private Treaty sale types
//   - Exchange of contracts → cooling-off period (varies by state)
//   - Settlement: typically 30–90 days, handled via PEXA (electronic)
//   - Stamp duty (state-based, now called Transfer Duty in some states)
//   - Building & pest inspection before making an offer
//   - Strata inspection report for apartments

export default function BuyerDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Buyer Dashboard</h1>
        <p className="text-text-muted mt-1">
          Search properties, track offers, and manage your purchase journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Saved Properties', value: '—', note: 'Shortlisted' },
          { label: 'Inspections Booked', value: '—', note: 'Upcoming' },
          { label: 'Offers Made', value: '—', note: 'Active' },
          { label: 'Under Contract', value: '—', note: 'In progress' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border-default bg-bg-secondary p-5"
          >
            <p className="text-sm text-text-muted mb-1">{item.label}</p>
            <p className="text-2xl font-semibold text-text-primary">{item.value}</p>
            <p className="text-xs text-text-muted mt-1">{item.note}</p>
          </div>
        ))}
      </div>

      {/* AU Purchase Journey Tracker */}
      <div className="rounded-xl border border-border-default bg-bg-secondary p-6 mb-4">
        <h2 className="font-semibold text-text-primary mb-4">Purchase Journey</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            'Search',
            'Inspect',
            'Due Diligence',
            'Make Offer / Bid',
            'Exchange',
            'Settlement',
          ].map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-2 text-sm text-text-muted"
            >
              {i > 0 && <span className="text-border-default">→</span>}
              <span className="px-3 py-1 rounded-full bg-bg-tertiary border border-border-default">
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-bg-secondary p-6">
        <p className="text-text-muted text-sm">
          🚧 AU Buyer Dashboard — connect to Supabase data with{' '}
          <code className="text-accent">region = &apos;AU&apos;</code> filter.
        </p>
      </div>
    </div>
  );
}
