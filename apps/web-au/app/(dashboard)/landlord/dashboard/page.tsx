// Landlord Dashboard — Australia
// Key differences from TW landlord dashboard:
//   - Currency: AUD (not TWD)
//   - Occupancy metric uses weeks not months for bond references
//   - Maintenance uses AU terminology (e.g. "property manager" not "管理員")
//   - Links will eventually point to AU-specific property/lease routes

import { Home, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { formatAUD } from '@/lib/market';

export default function LandlordDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Landlord Dashboard</h1>
        <p className="text-text-muted mt-1">Welcome back — here&apos;s your portfolio overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Properties"
          value="—"
          icon={<Home className="w-5 h-5" />}
          color="text-blue-400"
        />
        <KPICard
          title="Occupancy Rate"
          value="—"
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-400"
        />
        <KPICard
          title="Monthly Income"
          value={formatAUD(0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-yellow-400"
        />
        <KPICard
          title="Annual Income"
          value={formatAUD(0)}
          icon={<FileText className="w-5 h-5" />}
          color="text-purple-400"
        />
      </div>

      {/* Placeholder content */}
      <div className="rounded-xl border border-border-default bg-bg-secondary p-6">
        <p className="text-text-muted text-sm">
          🚧 AU Landlord Dashboard — connect to Supabase data with{' '}
          <code className="text-accent">region = &apos;AU&apos;</code> filter.
        </p>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-muted">{title}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
