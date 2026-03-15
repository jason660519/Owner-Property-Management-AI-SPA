// filepath: apps/superadmin/lib/utils/geocoding.ts
// Address geocoding utility using OpenStreetMap Nominatim.
// Note: Nominatim usage policy requires a valid User-Agent and max 1 request/second.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  accuracy: 'building' | 'street' | 'area' | 'unknown';
}

export interface GeocodeParams {
  city?: string;
  district?: string;
  street?: string;
  number?: string;
  rawAddress?: string;
}

/**
 * Query Nominatim for coordinates based on address.
 */
async function queryNominatim(params: Record<string, string>): Promise<any | null> {
  const searchParams = new URLSearchParams({
    ...params,
    format: 'json',
    addressdetails: '1',
    limit: '1',
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
      {
        headers: {
          'Accept-Language': 'zh-TW,zh,en',
          // Nominatim requires a descriptive User-Agent
          'User-Agent': 'Owner-Property-Management-AI-SPA/1.0',
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Nominatim query error:', error);
    return null;
  }
}

/**
 * Determine accuracy level from Nominatim result.
 */
function getAccuracy(result: any): GeocodeResult['accuracy'] {
  const { class: className, type } = result;
  
  if (className === 'building' || type === 'house' || type === 'address' || result.address?.house_number) {
    return 'building';
  }
  
  if (className === 'highway' || type === 'street' || type === 'road') {
    return 'street';
  }
  
  if (className === 'boundary' || className === 'place') {
    return 'area';
  }
  
  return 'unknown';
}

/**
 * Main geocoding function with fallback strategies.
 */
export async function geocodeAddress(params: GeocodeParams): Promise<GeocodeResult | null> {
  const { city, district, street, number, rawAddress } = params;

  // Strategies ordered from most specific to least specific.
  const strategies: Record<string, string>[] = [];

  // 1. Raw address or full composed address string (Highest priority for "Chinese Address" positioning)
  const fullAddress = rawAddress || (city && street ? `${city}${district || ''}${street}${number || ''}` : null);
  if (fullAddress) {
    // Try to strip floor/unit as they usually confuse geocoders
    const cleanFull = fullAddress.replace(/(?:\d+樓|之\d+).*$/, '').trim();
    if (cleanFull && cleanFull !== fullAddress) {
      strategies.push({ q: cleanFull, countrycodes: 'tw' });
    }
    strategies.push({ q: fullAddress, countrycodes: 'tw' });
  }

  // 2. Structured: City + District + Street + Number
  if (city && street && number) {
    strategies.push({
      q: `${city}${district || ''}${street}${number}`,
      countrycodes: 'tw',
    });
  }

  // 3. Structured: City + District + Street
  if (city && street) {
    strategies.push({
      q: `${city}${district || ''}${street}`,
      countrycodes: 'tw',
    });
  }

  // 4. City + Street only (fallback for district mismatches)
  if (city && street) {
    strategies.push({
      street: street as string,
      city: district || '',
      county: city as string,
      countrycodes: 'tw',
    });
  }

  for (let i = 0; i < strategies.length; i++) {
    // Delay 1.1s between retries to comply with Nominatim policy
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1100));

    const result = await queryNominatim(strategies[i]);
    if (result) {
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
        accuracy: getAccuracy(result),
      };
    }
  }

  return null;
}
