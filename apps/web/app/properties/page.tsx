// filepath: apps/web/app/properties/page.tsx
// created: 2026-01-22 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6

import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getProperties, type Property } from "@/lib/api/properties";
import PropertiesClient from "./PropertiesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner AI - 多角色案件市場",
  description:
    "瀏覽買賣與租賃案件，讓自售房東、自租房東、買家、租客與專業角色在同一個案件市場中接力推進。",
};

export default async function PropertiesPage() {
  let properties: Property[] = [];
  let isMock = false;

  try {
    const result = await getProperties();
    properties = result.properties;
    isMock = result.isMock;
  } catch (error) {
    console.error("PropertiesPage: Failed to load properties:", error);
    properties = [];
    isMock = true;
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
      <Header />

      <main className="pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <PropertiesClient initialProperties={properties} isMock={isMock} />
      </main>

      <Footer />
    </div>
  );
}
