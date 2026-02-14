// filepath: apps/web/lib/api/properties.ts
// created: 2026-01-22 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6

import { createClient } from '../supabase/server';

export interface PropertyDetails {
    title: string;
    description: string;
    imageUrl: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    type: string; // '公寓', '別墅', '套房', '華廈', etc.
    images?: string[];
}

export interface DatabaseProperty {
    id: string;
    owner_id: string;
    address: string;
    property_type: 'sale' | 'rental';
    price: number | null;
    monthly_rent: number | null;
    status: string;
    details: PropertyDetails;
    created_at: string;
}

export interface Property {
    id: string;
    title: string;
    description: string;
    address: string;
    type: string;
    status: string; // 'sale' | 'rent' for UI
    statusLabel: string; // 'available', 'sold', 'vacant', etc.
    price: string;
    rawPrice: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    imageUrl: string;
    images: string[];
    created_at: string;
}

/**
 * Safely parse raw Supabase row into DatabaseProperty with runtime validation.
 * Returns null if the data shape is invalid.
 */
function parseDatabaseProperty(
    raw: Record<string, unknown>,
    propertyType: 'sale' | 'rental'
): DatabaseProperty | null {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.id !== 'string' || typeof raw.address !== 'string') return null;

    const details = (raw.details && typeof raw.details === 'object')
        ? raw.details as Record<string, unknown>
        : {};

    return {
        id: raw.id as string,
        owner_id: (raw.owner_id as string) || '',
        address: raw.address as string,
        property_type: propertyType,
        price: typeof raw.price === 'number' ? raw.price : null,
        monthly_rent: typeof raw.monthly_rent === 'number' ? raw.monthly_rent : null,
        status: typeof raw.status === 'string' ? raw.status : 'unknown',
        details: {
            title: typeof details.title === 'string' ? details.title : '',
            description: typeof details.description === 'string' ? details.description : '',
            imageUrl: typeof details.imageUrl === 'string' ? details.imageUrl : '',
            bedrooms: typeof details.bedrooms === 'number' ? details.bedrooms : 0,
            bathrooms: typeof details.bathrooms === 'number' ? details.bathrooms : 0,
            area: typeof details.area === 'number' ? details.area : 0,
            type: typeof details.type === 'string' ? details.type : '',
            images: Array.isArray(details.images) ? details.images as string[] : undefined,
        },
        created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    };
}

function mapDatabaseToProperty(dbProp: DatabaseProperty): Property {
    const isSale = dbProp.property_type === 'sale';
    const price = isSale ? dbProp.price : dbProp.monthly_rent;
    const priceSuffix = isSale ? '' : '/月';
    const formattedPrice = price
        ? `NT$ ${price.toLocaleString()}${priceSuffix}`
        : '價格洽詢';

    return {
        id: dbProp.id,
        title: dbProp.details.title || '未命名物業',
        description: dbProp.details.description || '',
        address: dbProp.address,
        type: dbProp.details.type || (isSale ? '出售物件' : '出租物件'),
        status: isSale ? 'sale' : 'rent',
        statusLabel: dbProp.status,
        price: formattedPrice,
        rawPrice: price || 0,
        area: dbProp.details.area || 0,
        bedrooms: dbProp.details.bedrooms || 0,
        bathrooms: dbProp.details.bathrooms || 0,
        imageUrl: dbProp.details.imageUrl || dbProp.details.images?.[0] || '/images/placeholder.jpg',
        images: dbProp.details.images || (dbProp.details.imageUrl ? [dbProp.details.imageUrl] : []),
        created_at: dbProp.created_at,
    };
}

const MOCK_PROPERTIES: DatabaseProperty[] = [
    {
        id: 'mock-1',
        owner_id: 'mock-owner',
        address: '台北市信義區信義路五段',
        property_type: 'sale',
        price: 25000000,
        monthly_rent: null,
        status: 'available',
        created_at: new Date().toISOString(),
        details: {
            title: '現代都會公寓',
            description: '位於市中心的精品公寓，擁有絕佳視野與完善生活機能。寬敞的客廳採用落地窗設計，採光充足。開放式廚房配備頂級家電。大樓設有健身房、游泳池與24小時保全。',
            imageUrl: '/images/property-1.jpg',
            bedrooms: 3,
            bathrooms: 2,
            area: 35,
            type: '公寓',
            images: ['/images/property-1.jpg']
        }
    },
    {
        id: 'mock-2',
        owner_id: 'mock-owner',
        address: '新北市新店區華城路',
        property_type: 'sale',
        price: 48000000,
        monthly_rent: null,
        status: 'available',
        created_at: new Date().toISOString(),
        details: {
            title: '悠然別墅',
            description: '鄰近自然保護區的獨棟別墅，享受寧靜的鄉村生活。擁有私人花園與車庫。室內設計採用溫暖的木質調，營造放鬆氛圍。適合喜愛大自然的家庭。',
            imageUrl: '/images/property-2.jpg',
            bedrooms: 4,
            bathrooms: 3,
            area: 85,
            type: '別墅',
            images: ['/images/property-2.jpg']
        }
    },
    {
        id: 'mock-3',
        owner_id: 'mock-owner',
        address: '新北市淡水區中正東路',
        property_type: 'rental',
        price: null,
        monthly_rent: 35000,
        status: 'vacant',
        created_at: new Date().toISOString(),
        details: {
            title: '海景套房',
            description: '面海而居的高級套房，每天醒來都能擁抱海洋。位於度假勝地，擁有私人陽台可欣賞夕陽。室內裝潢現代時尚，配備智慧家庭系統。',
            imageUrl: '/images/property-3.jpg',
            bedrooms: 2,
            bathrooms: 1,
            area: 15,
            type: '套房',
            images: ['/images/property-3.jpg']
        }
    }
];

export interface PropertiesResult {
    properties: Property[];
    isMock: boolean;
}

/**
 * Fetch both property_sales and property_rentals, merge and sort by created_at.
 * Falls back to mock data on error or empty results.
 */
async function fetchAllProperties(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{
    sales: DatabaseProperty[];
    rentals: DatabaseProperty[];
    error: string | null;
}> {
    const [salesResult, rentalsResult] = await Promise.all([
        supabase.from('property_sales').select('*').order('created_at', { ascending: false }),
        supabase.from('property_rentals').select('*').order('created_at', { ascending: false }),
    ]);

    if (salesResult.error || rentalsResult.error) {
        const errMsg = (salesResult.error?.message || rentalsResult.error?.message) ?? 'Unknown error';
        return { sales: [], rentals: [], error: errMsg };
    }

    const sales = (salesResult.data || [])
        .map(row => parseDatabaseProperty(row as Record<string, unknown>, 'sale'))
        .filter((p): p is DatabaseProperty => p !== null);

    const rentals = (rentalsResult.data || [])
        .map(row => parseDatabaseProperty(row as Record<string, unknown>, 'rental'))
        .filter((p): p is DatabaseProperty => p !== null);

    return { sales, rentals, error: null };
}

export async function getProperties(): Promise<PropertiesResult> {
    let supabase;
    try {
        supabase = await createClient();
    } catch (error) {
        console.error('Failed to create Supabase client:', error);
        return {
            properties: MOCK_PROPERTIES.map(mapDatabaseToProperty),
            isMock: true
        };
    }

    const { sales, rentals, error } = await fetchAllProperties(supabase);

    if (error) {
        console.error('Error fetching properties, using mock data:', error);
        return {
            properties: MOCK_PROPERTIES.map(mapDatabaseToProperty),
            isMock: true
        };
    }

    const allProperties = [...sales, ...rentals].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (allProperties.length === 0) {
        console.warn('No properties found, using mock data for demo.');
        return {
            properties: MOCK_PROPERTIES.map(mapDatabaseToProperty),
            isMock: true
        };
    }

    return {
        properties: allProperties.map(mapDatabaseToProperty),
        isMock: false
    };
}

/**
 * Fetch a single property by ID.
 * Queries both property_sales and property_rentals directly
 * (consistent with getProperties, and supports anon access via RLS).
 */
export async function getProperty(id: string): Promise<Property | null> {
    // Check for mock ID
    if (id.startsWith('mock-')) {
        const mock = MOCK_PROPERTIES.find(p => p.id === id);
        return mock ? mapDatabaseToProperty(mock) : null;
    }

    let supabase;
    try {
        supabase = await createClient();
    } catch (error) {
        console.error('Failed to create Supabase client:', error);
        return null;
    }

    // Query both tables in parallel - same pattern as getProperties()
    const [salesResult, rentalsResult] = await Promise.all([
        supabase.from('property_sales').select('*').eq('id', id).maybeSingle(),
        supabase.from('property_rentals').select('*').eq('id', id).maybeSingle(),
    ]);

    // Check sales table first
    if (salesResult.data) {
        const parsed = parseDatabaseProperty(salesResult.data as Record<string, unknown>, 'sale');
        return parsed ? mapDatabaseToProperty(parsed) : null;
    }

    // Then check rentals table
    if (rentalsResult.data) {
        const parsed = parseDatabaseProperty(rentalsResult.data as Record<string, unknown>, 'rental');
        return parsed ? mapDatabaseToProperty(parsed) : null;
    }

    // Log errors if both failed
    if (salesResult.error && rentalsResult.error) {
        console.error(`Error fetching property ${id}:`, salesResult.error, rentalsResult.error);
    }

    return null;
}
