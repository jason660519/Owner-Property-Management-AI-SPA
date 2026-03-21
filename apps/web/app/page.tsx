import { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturedProperties } from "@/components/sections/FeaturedProperties";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { getProperties } from "@/lib/api/properties";

export const metadata: Metadata = {
  title: "Owner AI - 不動產交易與租賃服務協作平台",
  description:
    "服務房東、租客、買家、仲介、代書、律師與裝修團隊的不動產 AI 協作平台，從刊登、帶看、簽約到交屋與維修全流程整合。",
  keywords: ["不動產", "房地產", "AI", "房東", "租客", "買家", "仲介", "代書"],
  openGraph: {
    title: "Owner AI - 不動產交易與租賃服務協作平台",
    description:
      "服務房東、租客、買家、仲介、代書、律師與裝修團隊的不動產 AI 協作平台。",
    type: "website",
    locale: "zh_TW",
    siteName: "Owner AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Owner AI - 不動產交易與租賃服務協作平台",
    description:
      "服務房東、租客、買家、仲介、代書、律師與裝修團隊的不動產 AI 協作平台。",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const { properties, isMock } = await getProperties();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-primary">
      <Header />
      <main>
        <HeroSection />
        <FeaturedProperties properties={properties} isMock={isMock} />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
