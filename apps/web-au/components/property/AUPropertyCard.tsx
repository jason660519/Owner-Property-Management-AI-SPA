import { Bed, Bath, Car, MapPin, Ruler } from 'lucide-react';
import { formatAUD, formatSqm } from '@/lib/market';

export interface AUPropertyCardData {
  id: string;
  title: string | null;
  // AU address fields
  au_street_number?: string | null;
  au_street_name?: string | null;
  au_suburb?: string | null;
  au_state?: string | null;
  au_postcode?: string | null;
  // Price (AUD)
  price?: number | null;             // for sales
  monthly_rent?: number | null;      // for rentals
  // Layout
  layout_rooms?: number | null;
  layout_bathrooms?: number | null;
  has_parking?: boolean | null;
  // Area (sqm)
  au_area_internal_sqm?: number | null;
  au_area_land_sqm?: number | null;
  // Status
  status: string;
  // Meta
  type: 'sales' | 'rentals';
  primary_photo_url?: string | null;
}

interface AUPropertyCardProps {
  property: AUPropertyCardData;
  onClick?: () => void;
}

export default function AUPropertyCard({ property, onClick }: AUPropertyCardProps) {
  const address = [
    property.au_street_number && property.au_street_name
      ? `${property.au_street_number} ${property.au_street_name}`
      : property.au_street_name,
    property.au_suburb,
    property.au_state,
    property.au_postcode,
  ]
    .filter(Boolean)
    .join(' ');

  const priceDisplay =
    property.type === 'sales'
      ? property.price
        ? formatAUD(property.price)
        : 'Price on application'
      : property.monthly_rent
      ? `${formatAUD(property.monthly_rent)} / week`
      : 'Rent TBA';

  const statusColors: Record<string, string> = {
    available: 'bg-green-500/15 text-green-400',
    vacant: 'bg-green-500/15 text-green-400',
    pending: 'bg-yellow-500/15 text-yellow-400',
    occupied: 'bg-blue-500/15 text-blue-400',
    sold: 'bg-grey-60/20 text-text-muted',
    archived: 'bg-grey-60/20 text-text-muted',
    maintenance: 'bg-orange-500/15 text-orange-400',
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={[
        'rounded-xl border border-border-default bg-bg-secondary overflow-hidden',
        'transition-all duration-200',
        onClick ? 'cursor-pointer hover:border-accent hover:shadow-card' : '',
      ].join(' ')}
    >
      {/* Photo */}
      <div className="h-44 bg-bg-tertiary flex items-center justify-center relative">
        {property.primary_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.primary_photo_url}
            alt={property.title ?? address}
            className="w-full h-full object-cover"
          />
        ) : (
          <MapPin className="w-8 h-8 text-border-default" />
        )}
        {/* Status badge */}
        <span
          className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
            statusColors[property.status] ?? 'bg-grey-60/20 text-text-muted'
          }`}
        >
          {property.status}
        </span>
        {/* Type badge */}
        <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-bg-primary/80 text-text-secondary">
          {property.type === 'sales' ? 'For Sale' : 'For Rent'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <p className="text-lg font-semibold text-text-primary mb-1">{priceDisplay}</p>

        {/* Title */}
        {property.title && (
          <p className="text-sm font-medium text-text-secondary mb-1 truncate">{property.title}</p>
        )}

        {/* Address */}
        <p className="text-sm text-text-muted mb-3 truncate flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {address || 'Address not specified'}
        </p>

        {/* Features row */}
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          {property.layout_rooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {property.layout_rooms}
            </span>
          )}
          {property.layout_bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {property.layout_bathrooms}
            </span>
          )}
          {property.has_parking && (
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5" />1
            </span>
          )}
          {property.au_area_internal_sqm != null && (
            <span className="flex items-center gap-1 ml-auto">
              <Ruler className="w-3.5 h-3.5" />
              {formatSqm(property.au_area_internal_sqm)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
