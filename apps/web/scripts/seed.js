const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mockProperties = [
    {
        property_type: 'sale',
        address: '台北市信義區信義路五段',
        price: 25000000,
        status: 'available',
        details: {
            title: '現代都會公寓',
            description: '位於市中心的精品公寓，擁有絕佳視野與完善生活機能。寬敞的客廳採用落地窗設計，採光充足。開放式廚房配備頂級家電。大樓設有健身房、游泳池與24小時保全。',
            imageUrl: '/images/property-1.jpg',
            bedrooms: 3,
            bathrooms: 2,
            area: 35,
            type: '公寓'
        }
    },
    {
        property_type: 'sale',
        address: '新北市新店區華城路',
        price: 48000000,
        status: 'available',
        details: {
            title: '悠然別墅',
            description: '鄰近自然保護區的獨棟別墅，享受寧靜的鄉村生活。擁有私人花園與車庫。室內設計採用溫暖的木質調，營造放鬆氛圍。適合喜愛大自然的家庭。',
            imageUrl: '/images/property-2.jpg',
            bedrooms: 4,
            bathrooms: 3,
            area: 85,
            type: '別墅'
        }
    },
    {
        property_type: 'rental',
        address: '新北市淡水區中正東路',
        monthly_rent: 35000,
        status: 'vacant',
        details: {
            title: '海景套房',
            description: '面海而居的高級套房，每天醒來都能擁抱海洋。位於度假勝地，擁有私人陽台可欣賞夕陽。室內裝潢現代時尚，配備智慧家庭系統。',
            imageUrl: '/images/property-3.jpg',
            bedrooms: 2,
            bathrooms: 1,
            area: 15,
            type: '套房'
        }
    },
];

async function seed() {
    console.log('Connecting to Supabase at:', SUPABASE_URL);

    let userId;

    // 1. Sign Up / Sign In User
    console.log('Authenticating test user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'test_landlord@example.com',
        password: 'password123',
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already exists, signing in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: 'test_landlord@example.com',
                password: 'password123',
            });
            if (signInError) {
                console.error('Sign in failed:', signInError);
                return;
            }
            userId = signInData.user.id;
        } else {
            console.error('Sign up failed:', authError);
            return;
        }
    } else {
        // Check if we got a session (if confirmation not required)
        if (authData.user) {
            userId = authData.user.id;
            console.log('User created:', userId);
        } else {
            console.error('User creation pending confirmation? This might be an issue locally.');
            return;
        }
    }

    // 2. Ensure User Profile Exists
    console.log('Ensuring user profile exists for:', userId);
    const { error: profileError } = await supabase.from('users_profile').upsert({
        id: userId,
        role: 'landlord',
        display_name: 'Test Landlord',
        phone: '0912345678',
        address: 'Taipei, Taiwan'
    });

    if (profileError) {
        console.error('Profile upsert error:', profileError);
        // Continue anyway, maybe it already exists via trigger
    }

    // 3. Insert Properties
    console.log('Seeding properties...');

    for (const p of mockProperties) {
        // Prepare payload
        const payload = {
            ...p,
            owner_id: userId
        };

        const { data, error } = await supabase.from('properties').insert(payload).select();

        if (error) {
            console.error(`Error inserting ${p.details.title}:`, error);
        } else {
            console.log(`Inserted ${p.details.title}`);
        }
    }

    console.log('Seed completed.');
}

seed();
