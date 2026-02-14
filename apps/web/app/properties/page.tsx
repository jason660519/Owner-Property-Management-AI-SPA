// filepath: apps/web/app/properties/page.tsx
// created: 2026-01-22 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getProperties, type Property } from '@/lib/api/properties';
import PropertiesClient from './PropertiesClient';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
    let properties: Property[] = [];
    let isMock = false;

    try {
        const result = await getProperties();
        properties = result.properties;
        isMock = result.isMock;
    } catch (error) {
        console.error('PropertiesPage: Failed to load properties:', error);
        properties = [];
        isMock = true;
    }

    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main className="pt-32 pb-20 px-6 md:px-12 lg:px-20">
                <PropertiesClient initialProperties={properties} isMock={isMock} />
            </main>

            <Footer />
        </div>
    );
}
