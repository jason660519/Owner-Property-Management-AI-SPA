import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { revalidatePath } from 'next/cache';

export default async function DbCheckPage() {
    const supabase = await createClient();
    const { data: properties, error } = await supabase.from('properties').select('*');

    async function seedData() {
        'use server';
        const supabase = await createClient();

        // 檢查是否已有數據，避免重複
        const { count } = await supabase.from('properties').select('*', { count: 'exact', head: true });

        if (count && count > 0) {
            console.log('Database already has data, skipping seed.');
            return;
        }

        const mockProperties = [
            {
                title: '現代都會公寓',
                description: '位於市中心的精品公寓，擁有絕佳視野與完善生活機能。寬敞的客廳採用落地窗設計，採光充足。開放式廚房配備頂級家電。大樓設有健身房、游泳池與24小時保全。',
                address: '台北市信義區信義路五段',
                type: '公寓',
                status: 'sale',
                price: 25000000, // 假設資料庫是存整數
                area: 35,
                bedrooms: 3,
                bathrooms: 2,
                image_url: '/images/property-1.jpg',
            },
            {
                title: '悠然別墅',
                description: '鄰近自然保護區的獨棟別墅，享受寧靜的鄉村生活。擁有私人花園與車庫。室內設計採用溫暖的木質調，營造放鬆氛圍。適合喜愛大自然的家庭。',
                address: '新北市新店區華城路',
                type: '別墅',
                status: 'sale',
                price: 48000000,
                area: 85,
                bedrooms: 4,
                bathrooms: 3,
                image_url: '/images/property-2.jpg',
            },
            {
                title: '海景套房',
                description: '面海而居的高級套房，每天醒來都能擁抱海洋。位於度假勝地，擁有私人陽台可欣賞夕陽。室內裝潢現代時尚，配備智慧家庭系統。',
                address: '新北市淡水區中正東路',
                type: '套房',
                status: 'rent',
                price: 35000, // 月租
                area: 15,
                bedrooms: 2,
                bathrooms: 1,
                image_url: '/images/property-3.jpg',
            },
        ];

        const { error } = await supabase.from('properties').insert(mockProperties);

        if (error) {
            console.error('Error seeding data:', error);
        } else {
            console.log('Data seeded successfully');
            revalidatePath('/debug/db-check');
        }
    }

    return (
        <div className="p-8 bg-black text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Database Check</h1>

            <div className="mb-8">
                <form action={seedData}>
                    <Button type="submit">Seed Initial Data (If Empty)</Button>
                </form>
            </div>

            {error && (
                <div className="bg-red-900/50 p-4 rounded mb-4 text-red-200">
                    Error: {error.message}
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}

            <div className="grid gap-4">
                {properties && properties.length > 0 ? (
                    properties.map((p: any) => (
                        <div key={p.id} className="border border-gray-700 p-4 rounded">
                            <h3 className="font-bold">{p.title}</h3>
                            <p className="text-sm text-gray-400">ID: {p.id}</p>
                            <p className="text-sm">Type: {p.type} | Status: {p.status}</p>
                            <p className="text-sm">Image: {p.image_url}</p>
                            <pre className="text-xs mt-2 bg-gray-900 p-2 overflow-auto">
                                {JSON.stringify(p, null, 2)}
                            </pre>
                        </div>
                    ))
                ) : (
                    <p>No properties found in database.</p>
                )}
            </div>
        </div>
    );
}
