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
  // #region agent log
  const { appendFile } = await import('fs/promises');
  const { join } = await import('path');
  const logPath = join(process.cwd(), '.cursor', 'debug.log');
  const logEntry = JSON.stringify({location:'app/page.tsx:30',message:'HomePage function entry',data:{hasEnvUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasEnvKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n';
  appendFile(logPath, logEntry).catch(()=>{});
  // #endregion
  let properties;
  try {
    // #region agent log
    const { appendFile: appendFile2 } = await import('fs/promises');
    const { join: join2 } = await import('path');
    const logPath2 = join2(process.cwd(), '.cursor', 'debug.log');
    const logEntry2 = JSON.stringify({location:'app/page.tsx:35',message:'Before getProperties call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
    appendFile2(logPath2, logEntry2).catch(()=>{});
    // #endregion
    properties = await getProperties();
    // #region agent log
    const { appendFile: appendFile3 } = await import('fs/promises');
    const { join: join3 } = await import('path');
    const logPath3 = join3(process.cwd(), '.cursor', 'debug.log');
    const logEntry3 = JSON.stringify({location:'app/page.tsx:38',message:'After getProperties call',data:{propertiesCount:properties?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
    appendFile3(logPath3, logEntry3).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    const { appendFile: appendFile4 } = await import('fs/promises');
    const { join: join4 } = await import('path');
    const logPath4 = join4(process.cwd(), '.cursor', 'debug.log');
    const logEntry4 = JSON.stringify({location:'app/page.tsx:41',message:'Error in getProperties',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
    appendFile4(logPath4, logEntry4).catch(()=>{});
    // #endregion
    throw error;
  }

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
