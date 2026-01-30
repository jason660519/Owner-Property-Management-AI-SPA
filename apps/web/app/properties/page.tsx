import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getProperties } from '@/lib/api/properties';
import PropertiesClient from './PropertiesClient';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
    const properties = await getProperties();

    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main className="pt-32 pb-20 px-6 md:px-12 lg:px-20">
                <PropertiesClient initialProperties={properties} />
            </main>

            <Footer />
        </div>
    );
}
