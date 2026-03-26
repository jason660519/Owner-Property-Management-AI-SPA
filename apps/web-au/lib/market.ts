// AU market constants — single source of truth for all AU-specific configs.
// Import this wherever market-specific values are needed instead of hardcoding.

export const AU_MARKET = {
  region: 'AU',
  currency: 'AUD',
  currencySymbol: 'A$',
  locale: 'en-AU',
  timezone: 'Australia/Sydney',
  language: 'en-AU',

  // Rental bond: typically 4 weeks in NSW/QLD/VIC, 2-4 weeks in WA/SA
  defaultBondWeeks: 4,

  // Australian states and territories
  states: [
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'WA', name: 'Western Australia' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NT', name: 'Northern Territory' },
  ],

  // Property types used in Australian real estate
  propertyTypes: [
    'House',
    'Apartment / Unit',
    'Townhouse',
    'Villa',
    'Duplex',
    'Studio',
    'Land',
    'Acreage / Semi-Rural',
    'Rural',
    'Commercial',
  ],

  // Listing types — mirrors AU real estate conventions
  saleTypes: ['Private Treaty', 'Auction', 'Expressions of Interest'],

  // Area unit: always sqm in Australia (never 坪/ping)
  areaUnit: 'sqm',

  // Standard bond lodgement info per state
  bondAuthority: {
    NSW: 'NSW Fair Trading (myBond)',
    VIC: 'Residential Tenancies Bond Authority (RTBA)',
    QLD: 'Residential Tenancies Authority (RTA)',
    WA: 'Bond Administrator',
    SA: 'Consumer and Business Services (CBS)',
    TAS: 'Rental Deposit Authority (RDA)',
    ACT: 'ACT Revenue Office',
    NT: 'NT Consumer Affairs',
  },

  // Social login options for AU (Line is not popular in Australia)
  socialLoginProviders: ['google', 'apple'],
} as const;

export type AustralianState = (typeof AU_MARKET.states)[number]['code'];

/** Format AUD currency in AU locale */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Format sqm area */
export function formatSqm(sqm: number): string {
  return `${sqm.toLocaleString('en-AU')} sqm`;
}

/** Build full AU address string */
export function formatAUAddress(params: {
  streetNumber?: string;
  streetName?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}): string {
  const parts = [
    params.streetNumber && params.streetName
      ? `${params.streetNumber} ${params.streetName}`
      : params.streetName,
    params.suburb,
    params.state && params.postcode
      ? `${params.state} ${params.postcode}`
      : params.state || params.postcode,
  ].filter(Boolean);
  return parts.join(', ');
}
