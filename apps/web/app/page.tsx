import { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { FeaturedProperties } from '@/components/sections/FeaturedProperties';
import { Testimonials } from '@/components/sections/Testimonials';
import { FAQ } from '@/components/sections/FAQ';
import { getProperties } from '@/lib/api/properties';

export const metadata: Metadata = {
  title: 'Estatein - 房東物業的 AI 好幫手',
  description: '透過 AI 智能平台，輕鬆管理您的不動產資產。無論是租賃管理、物業維護還是收益優化，我們都能為您提供全方位的解決方案。',
  keywords: ['物業管理', '房地產', 'AI', '租賃管理', '房東', '不動產'],
  openGraph: {
    title: 'Estatein - 房東物業的 AI 好幫手',
    description: '透過 AI 智能平台，輕鬆管理您的不動產資產。',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'Estatein',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estatein - 房東物業的 AI 好幫手',
    description: '透過 AI 智能平台，輕鬆管理您的不動產資產。',
  },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const properties = await getProperties();

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturedProperties properties={properties} />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
