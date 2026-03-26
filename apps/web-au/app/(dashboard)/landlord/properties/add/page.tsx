'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import AUAddressInput, { type AUAddressValue } from '@/components/address/AUAddressInput';
import { AU_MARKET, formatAUD } from '@/lib/market';
import { createClient } from '@/utils/supabase/client';

type ListingType = 'rentals' | 'sales';

const EMPTY_ADDRESS: AUAddressValue = {
  streetNumber: '',
  streetName: '',
  suburb: '',
  state: '',
  postcode: '',
};

export default function AddAUPropertyPage() {
  const router = useRouter();
  const [listingType, setListingType] = useState<ListingType>('rentals');
  const [address, setAddress] = useState<AUAddressValue>(EMPTY_ADDRESS);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [parking, setParking] = useState(false);
  const [internalSqm, setInternalSqm] = useState('');
  const [landSqm, setLandSqm] = useState('');
  const [bondWeeks, setBondWeeks] = useState('4');
  const [saleType, setSaleType] = useState('private_treaty');
  const [isStrata, setIsStrata] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const table = listingType === 'rentals' ? 'property_rentals' : 'property_sales';
      const fullAddress = [
        address.streetNumber && address.streetName
          ? `${address.streetNumber} ${address.streetName}`
          : address.streetName,
        address.suburb,
        address.state,
        address.postcode,
      ].filter(Boolean).join(' ');

      // 1. Insert base property row
      const basePayload: Record<string, unknown> = {
        owner_id: user.id,
        region: 'AU',
        currency: 'AUD',
        title: title || null,
        address: fullAddress,
        building_type: propertyType || null,
        layout_rooms: bedrooms ? parseInt(bedrooms) : 0,
        layout_bathrooms: bathrooms ? parseInt(bathrooms) : 0,
        has_parking: parking,
        notes: notes || null,
        status: listingType === 'rentals' ? 'vacant' : 'available',
      };

      if (listingType === 'rentals') {
        basePayload.monthly_rent = price ? parseFloat(price) * 4.33 : 0; // weekly → monthly approx
      } else {
        basePayload.price = price ? parseFloat(price) : 0;
      }

      const { data: propertyRow, error: insertErr } = await supabase
        .from(table)
        .insert(basePayload)
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // 2. Insert AU-specific details
      const auPayload: Record<string, unknown> = {
        property_id: propertyRow.id,
        property_type: listingType,
        au_street_number: address.streetNumber || null,
        au_street_name: address.streetName || null,
        au_suburb: address.suburb || null,
        au_state: address.state || null,
        au_postcode: address.postcode || null,
        au_area_internal_sqm: internalSqm ? parseFloat(internalSqm) : null,
        au_area_land_sqm: landSqm ? parseFloat(landSqm) : null,
        au_is_strata: isStrata,
      };

      if (listingType === 'rentals') {
        auPayload.au_bond_weeks = parseInt(bondWeeks) || 4;
      } else {
        auPayload.au_sale_type = saleType;
      }

      const { error: auErr } = await supabase
        .from('property_au_details')
        .insert(auPayload);

      if (auErr) throw auErr;

      router.push('/landlord/properties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    'w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border-default ' +
    'text-text-primary placeholder:text-text-muted text-sm ' +
    'focus:outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-xs font-medium text-text-secondary mb-1';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:border-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Add Property</h1>
          <p className="text-sm text-text-muted">Australia — {AU_MARKET.region}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Listing type tabs */}
        <div className="flex gap-1 p-1 bg-bg-secondary border border-border-default rounded-xl w-fit">
          {(['rentals', 'sales'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setListingType(t)}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                listingType === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {t === 'rentals' ? 'For Rent' : 'For Sale'}
            </button>
          ))}
        </div>

        {/* Basic info */}
        <section className="rounded-xl border border-border-default bg-bg-secondary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Basic Information</h2>

          <div>
            <label className={labelClass}>Listing Title (optional)</label>
            <input
              type="text"
              placeholder="e.g. Spacious 3-bed house with pool"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Property Type</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={fieldClass}>
                <option value="">Select type</option>
                {AU_MARKET.propertyTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {listingType === 'rentals' ? 'Weekly Rent (AUD)' : 'Asking Price (AUD)'}
              </label>
              <input
                type="number"
                placeholder={listingType === 'rentals' ? 'e.g. 550' : 'e.g. 850000'}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
              />
              {price && (
                <p className="text-xs text-text-muted mt-1">
                  {formatAUD(parseFloat(price) || 0)}
                  {listingType === 'rentals' && ' / week'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-xl border border-border-default bg-bg-secondary p-5">
          <AUAddressInput value={address} onChange={setAddress} required />
        </section>

        {/* Layout & Area */}
        <section className="rounded-xl border border-border-default bg-bg-secondary p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Layout & Area</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input type="number" min="0" placeholder="3" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input type="number" min="0" placeholder="2" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={fieldClass} />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)} className="w-4 h-4 accent-accent" />
                <span className="text-sm text-text-secondary">Car space</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Internal area (sqm)</label>
              <input type="number" placeholder="120" value={internalSqm} onChange={(e) => setInternalSqm(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Land size (sqm)</label>
              <input type="number" placeholder="450" value={landSqm} onChange={(e) => setLandSqm(e.target.value)} className={fieldClass} />
            </div>
          </div>
        </section>

        {/* Rental-specific */}
        {listingType === 'rentals' && (
          <section className="rounded-xl border border-border-default bg-bg-secondary p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">Rental Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bond (weeks)</label>
                <select value={bondWeeks} onChange={(e) => setBondWeeks(e.target.value)} className={fieldClass}>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} weeks</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isStrata} onChange={(e) => setIsStrata(e.target.checked)} className="w-4 h-4 accent-accent" />
                  <span className="text-sm text-text-secondary">Strata / Body Corporate</span>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Sale-specific */}
        {listingType === 'sales' && (
          <section className="rounded-xl border border-border-default bg-bg-secondary p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">Sale Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sale method</label>
                <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className={fieldClass}>
                  <option value="private_treaty">Private Treaty</option>
                  <option value="auction">Auction</option>
                  <option value="expressions_of_interest">Expressions of Interest</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isStrata} onChange={(e) => setIsStrata(e.target.checked)} className="w-4 h-4 accent-accent" />
                  <span className="text-sm text-text-secondary">Strata / Body Corporate</span>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Notes */}
        <section className="rounded-xl border border-border-default bg-bg-secondary p-5">
          <label className={labelClass}>Notes (internal)</label>
          <textarea
            rows={3}
            placeholder="Any internal notes about this property…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${fieldClass} resize-none`}
          />
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:border-accent transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save property'}
          </button>
        </div>
      </form>
    </div>
  );
}
