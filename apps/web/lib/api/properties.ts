import { createClient } from '../supabase/server';

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

export async function getProperties() {
    const supabase = createClient();
    const { data, error } = await (await supabase).from('properties').select('*').order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching properties, using mock data:', error);
        return MOCK_PROPERTIES.map(mapDatabaseToProperty);
    }

    if (!data || data.length === 0) {
        console.warn('No properties found, using mock data for demo.');
        return MOCK_PROPERTIES.map(mapDatabaseToProperty);
    }

    // Cast because Supabase types might imply details is just Json
    return (data as unknown as DatabaseProperty[]).map(mapDatabaseToProperty);
}

export async function getProperty(id: string) {
    // Check for mock ID
    if (id.startsWith('mock-')) {
        const mock = MOCK_PROPERTIES.find(p => p.id === id);
        return mock ? mapDatabaseToProperty(mock) : null;
    }

    const supabase = createClient();
    const { data, error } = await (await supabase).from('properties').select('*').eq('id', id).single();

    if (error) {
        console.error(`Error fetching property ${id}:`, error);
        return null;
    }

    return mapDatabaseToProperty(data as unknown as DatabaseProperty);
}
