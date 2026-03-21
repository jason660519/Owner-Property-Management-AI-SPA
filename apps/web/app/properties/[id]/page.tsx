import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PropertyContactCard } from "@/components/property/PropertyContactCard";
import { getProperty } from "@/lib/api/properties";
import { createClient } from "@/utils/supabase/server";

function getWorkflowBadge(status: string) {
  return status === "rent" ? "租賃協作鏈" : "買賣協作鏈";
}

function getRecommendedRoles(status: string) {
  return status === "rent"
    ? ["自租房東", "租客", "仲介", "代書"]
    : ["自售房東", "買家", "仲介", "代書"];
}

function getWorkflowSteps(status: string) {
  return status === "rent"
    ? [
        {
          title: "需求進場",
          description: "房東上架案件，租客或仲介開始接觸與篩選。",
        },
        {
          title: "帶看與談條件",
          description: "安排看房、整理問答與確認租賃條件。",
        },
        {
          title: "簽約與點交",
          description: "補齊文件、確認條款，完成簽約與入住交接。",
        },
      ]
    : [
        {
          title: "案件建立",
          description: "自售房東或代理方先把物件、文件與需求帶進平台。",
        },
        {
          title: "買家與仲介接手",
          description: "安排看屋、追蹤問答與推進出價、斡旋或談判。",
        },
        {
          title: "代書與交屋",
          description: "補件、簽約、履約與交屋節點在同一條案件流程中完成。",
        },
      ];
}

function getWorkflowDescription(status: string) {
  return status === "rent"
    ? "這是一筆可讓房東、租客、仲介與簽約流程在同一案件中接力的租賃案件。"
    : "這是一筆可讓自售房東、買家、仲介與代書在同一案件中接力推進的買賣案件。";
}

// This is required for Next.js 15+ / 16
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const [property, supabase] = await Promise.all([
    getProperty(id),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!property) {
    notFound();
    return null;
  }

  const workflowBadge = getWorkflowBadge(property.status);
  const recommendedRoles = getRecommendedRoles(property.status);
  const workflowSteps = getWorkflowSteps(property.status);

  return (
    <div className="min-h-screen bg-[#141414] text-white font-urbanist">
      <Header />

      <main className="pt-24 pb-20">
        {/* Image Gallery / Hero */}
        <div className="relative w-full h-[50vh] md:h-[60vh] bg-[#1A1A1A]">
          <Image
            src={property.imageUrl}
            alt={property.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent opacity-80" />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-20 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm font-semibold px-3 py-1 rounded bg-[#7C3AED]/15 text-[#BFA4FF] border border-[#7C3AED]/30">
                    {workflowBadge}
                  </span>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded ${
                      property.status === "rent"
                        ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                        : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    {property.statusLabel.toUpperCase()}
                  </span>
                  <span className="text-[#CCCCCC] text-sm border border-[#333333] px-3 py-1 rounded">
                    {property.type}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-2">
                  {property.title}
                </h1>
                <p className="text-[#999999] text-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {property.address}
                </p>
                <p className="text-[#CCCCCC] max-w-2xl mt-4 leading-7">
                  {getWorkflowDescription(property.status)}
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <span className="text-3xl md:text-4xl font-bold text-[#7C3AED]">
                  {property.price}
                </span>
                {property.status === "rent" && (
                  <span className="text-[#999999]">包含管理費</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Description & Details */}
          <div className="lg:col-span-2 space-y-12">
            <div className="rounded-xl border border-[#262626] bg-[#1A1A1A] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-3">推薦接手角色</h2>
                  <p className="text-[#999999] leading-7">
                    這筆案件適合從下列角色開始協作，讓詢問、帶看、文件與簽約節點不再分散在不同工具中。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {recommendedRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-[#333333] bg-[#141414] px-4 py-2 text-sm text-[#E5E5E5]"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-3 gap-4 bg-[#1A1A1A] p-6 rounded-xl border border-[#262626]">
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <span className="text-[#999999] text-sm mb-1">臥室</span>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <svg
                    className="w-6 h-6 text-[#7C3AED]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  {property.bedrooms}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 text-center border-l border-[#262626]">
                <span className="text-[#999999] text-sm mb-1">衛浴</span>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <svg
                    className="w-6 h-6 text-[#7C3AED]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {property.bathrooms}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 text-center border-l border-[#262626]">
                <span className="text-[#999999] text-sm mb-1">坪數</span>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <svg
                    className="w-6 h-6 text-[#7C3AED]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  {property.area}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold mb-6">案件說明</h2>
              <div className="text-[#CCCCCC] leading-relaxed space-y-4 whitespace-pre-line">
                {property.description}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">案件協作節點</h2>
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-4 rounded-xl border border-[#262626] bg-[#1A1A1A] p-5"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#7C3AED] text-sm font-bold text-[#7C3AED]">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                      <p className="text-[#999999] leading-7">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Placeholder */}
            <div>
              <h2 className="text-2xl font-bold mb-6">位置地圖</h2>
              <div className="w-full h-64 bg-[#262626] rounded-xl flex items-center justify-center text-[#666666]">
                地圖預覽 ({property.address})
              </div>
            </div>
          </div>

          {/* Right Column: Contact Card */}
          <div className="lg:col-span-1">
            <PropertyContactCard
              isLoggedIn={user !== null}
              propertyId={property.id}
              propertyTitle={property.title}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
