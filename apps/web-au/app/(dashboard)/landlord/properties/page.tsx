// AU Landlord — Property Listing
// Differences from TW version:
//   - Queries property_sales / property_rentals WHERE region = 'AU'
//   - JOINs property_au_details for address, sqm, bond info
//   - Displays AUD prices, sqm areas
//   - Status labels in English
//   - "For Sale" / "For Rent" tabs (same concept, different copy)
//   - Add Property links to AU-specific add form (coming next)

'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import AUPropertyCard, { type AUPropertyCardData } from '@/components/property/AUPropertyCard';
import { createClient } from '@/utils/supabase/client';

type ListingType = 'rentals' | 'sales';
type StatusFilter = 'all' | 'available' | 'vacant' | 'occupied' | 'pending' | 'archived' | 'maintenance';

export default function AUPropertiesPage() {
  const [type, setType] = useState<ListingType>('rentals');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState<AUPropertyCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  async function fetchProperties() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Base query filtered to AU region only
      const table = type === 'rentals' ? 'property_rentals' : 'property_sales';
      let query = supabase
        .from(table)
        .select(
          `
          id,
          title,
          status,
          ${type === 'rentals' ? 'monthly_rent,' : 'price,'}
          layout_rooms,
          layout_bathrooms,
          has_parking,
          property_au_details!left(
            au_street_number,
            au_street_name,
            au_suburb,
            au_state,
            au_postcode,
            au_area_internal_sqm,
            au_area_land_sqm
          )
        `
        )
        .eq('region', 'AU')
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Flatten the joined au_details into the card shape
      const cards: AUPropertyCardData[] = (data ?? []).map((row) => {
        const au = Array.isArray(row.property_au_details)
          ? row.property_au_details[0]
          : row.property_au_details;
        return {
          id: row.id,
          title: row.title ?? null,
          status: row.status,
          type,
          price: type === 'sales' ? (row as { price?: number }).price ?? null : null,
          monthly_rent: type === 'rentals' ? (row as { monthly_rent?: number }).monthly_rent ?? null : null,
          layout_rooms: row.layout_rooms ?? null,
          layout_bathrooms: row.layout_bathrooms ?? null,
          has_parking: row.has_parking ?? null,
          au_street_number: au?.au_street_number ?? null,
          au_street_name: au?.au_street_name ?? null,
          au_suburb: au?.au_suburb ?? null,
          au_state: au?.au_state ?? null,
          au_postcode: au?.au_postcode ?? null,
          au_area_internal_sqm: au?.au_area_internal_sqm ?? null,
          au_area_land_sqm: au?.au_area_land_sqm ?? null,
          primary_photo_url: null, // TODO: join property_photos
        };
      });

      setProperties(cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }

  const filtered = properties.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.au_suburb?.toLowerCase().includes(q) ||
      p.au_street_name?.toLowerCase().includes(q)
    );
  });

  const statusOptions: { value: StatusFilter; label: string }[] =
    type === 'rentals'
      ? [
          { value: 'all', label: 'All' },
          { value: 'vacant', label: 'Vacant' },
          { value: 'occupied', label: 'Occupied' },
          { value: 'maintenance', label: 'Maintenance' } as { value: StatusFilter; label: string },
          { value: 'archived', label: 'Archived' },
        ]
      : [
          { value: 'all', label: 'All' },
          { value: 'available', label: 'Available' },
          { value: 'pending', label: 'Pending' },
          { value: 'archived', label: 'Archived' },
        ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Properties</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {loading ? '…' : `${filtered.length} propert${filtered.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProperties}
            className="p-2 rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:border-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/landlord/properties/add"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </a>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary border border-border-default rounded-xl mb-4 w-fit">
        {(['rentals', 'sales'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setStatus('all'); }}
            className={[
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              type === t
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {t === 'rentals' ? 'Rentals' : 'Sales'}
          </button>
        ))}
      </div>

      {/* Search + Status filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search suburb, street, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-bg-secondary border border-border-default text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="pl-9 pr-8 py-2.5 rounded-lg bg-bg-secondary border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent appearance-none"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-bg-secondary border border-border-default animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-center">
          <p className="text-error text-sm">{error}</p>
          <button
            onClick={fetchProperties}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-secondary p-12 text-center">
          <p className="text-text-muted mb-2">No properties found</p>
          {properties.length === 0 && (
            <a
              href="/landlord/properties/add"
              className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add your first property
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <AUPropertyCard
              key={p.id}
              property={p}
              onClick={() => window.location.assign(`/landlord/properties/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
