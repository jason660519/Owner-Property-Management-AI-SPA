import { createClient } from '../supabase/server';
import { writeFile, appendFile } from 'fs/promises';
import { join } from 'path';

export interface PropertyDetails {
    title: string;
    description: string;
    imageUrl: string; // CamelCase in JSON
    bedrooms: number;
    bathrooms: number;
    area: number;
    type: string; // '公寓', etc.
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
    statusLabel: string; // 'available', 'sold'
    price: string;
    rawPrice: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    imageUrl: string;
    images: string[];
    created_at: string;
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

export async function getProperties(): Promise<PropertiesResult> {
    // #region agent log
    const logPath = join(process.cwd(), '.cursor', 'debug.log');
    const logEntry = JSON.stringify({location:'lib/api/properties.ts:134',message:'getProperties entry',data:{hasEnvUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasEnvKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,envUrlLength:process.env.NEXT_PUBLIC_SUPABASE_URL?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n';
    appendFile(logPath, logEntry).catch(()=>{});
    // #endregion
    let supabase;
    try {
        // #region agent log
        const logPath2 = join(process.cwd(), '.cursor', 'debug.log');
        const logEntry2 = JSON.stringify({location:'lib/api/properties.ts:138',message:'Before createClient call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
        appendFile(logPath2, logEntry2).catch(()=>{});
        // #endregion
        supabase = await createClient();
        // #region agent log
        const logPath3 = join(process.cwd(), '.cursor', 'debug.log');
        const logEntry3 = JSON.stringify({location:'lib/api/properties.ts:141',message:'After createClient call',data:{supabaseType:typeof supabase,hasFrom:typeof supabase?.from==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
        appendFile(logPath3, logEntry3).catch(()=>{});
        // #endregion
    } catch (error) {
        // #region agent log
        const logPath4 = join(process.cwd(), '.cursor', 'debug.log');
        const logEntry4 = JSON.stringify({location:'lib/api/properties.ts:144',message:'Error in createClient',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
        appendFile(logPath4, logEntry4).catch(()=>{});
        // #endregion
        console.error('Failed to create Supabase client:', error);
        return {
            properties: MOCK_PROPERTIES.map(mapDatabaseToProperty),
            isMock: true
        };
    }
    // #region agent log
    const logPath5 = join(process.cwd(), '.cursor', 'debug.log');
    const logEntry5 = JSON.stringify({location:'lib/api/properties.ts:148',message:'Before Supabase query',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
    appendFile(logPath5, logEntry5).catch(()=>{});
    // #endregion
    
    const { data: salesData, error: salesError } = await supabase
        .from('property_sales')
        .select('*')
        .order('created_at', { ascending: false });

    const { data: rentalsData, error: rentalsError } = await supabase
        .from('property_rentals')
        .select('*')
        .order('created_at', { ascending: false });

    // #region agent log
    const logPath6 = join(process.cwd(), '.cursor', 'debug.log');
    const logEntry6 = JSON.stringify({location:'lib/api/properties.ts:150',message:'After Supabase query',data:{hasSalesError:!!salesError,hasRentalsError:!!rentalsError,salesCount:salesData?.length||0,rentalsCount:rentalsData?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
    appendFile(logPath6, logEntry6).catch(()=>{});
    // #endregion

    if (salesError || rentalsError) {
        console.error('Error fetching properties, using mock data:', salesError || rentalsError);
        return {
            properties: MOCK_PROPERTIES.map(mapDatabaseToProperty),
            isMock: true
        };
    }

    const sales = (salesData || []).map(p => ({ ...p, property_type: 'sale' }));
    const rentals = (rentalsData || []).map(p => ({ ...p, property_type: 'rental' }));
    
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
        properties: (allProperties as unknown as DatabaseProperty[]).map(mapDatabaseToProperty),
        isMock: false
    };
}

export async function getProperty(id: string) {
    // Check for mock ID
    if (id.startsWith('mock-')) {
        const mock = MOCK_PROPERTIES.find(p => p.id === id);
        return mock ? mapDatabaseToProperty(mock) : null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();

    if (error) {
        console.error(`Error fetching property ${id}:`, error);
        return null;
    }

    return mapDatabaseToProperty(data as unknown as DatabaseProperty);
}
