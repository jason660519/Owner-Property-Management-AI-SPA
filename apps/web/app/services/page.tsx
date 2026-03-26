"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

const rolePillars = [
  {
    icon: "🏠",
    title: "自租屋主（免費）",
    description:
      "免費刊登出租物件、整理詢問、安排帶看、追蹤租約與點交進度。基本 AI 功能免費，高成本功能有配額。",
    tags: ["刊登管理", "帶看追蹤", "租約追蹤"],
  },
  {
    icon: "🏡",
    title: "自售屋主（按物件付費）",
    description:
      "AI 產品說明書生成、帶看記錄、詢問整合、斡旋金追蹤與代書協作銜接。不需透過仲介也能把買賣案件跑完整。",
    tags: ["AI 文案", "斡旋追蹤", "代書協作"],
  },
  {
    icon: "🤝",
    title: "仲介個人 / 分店",
    description:
      "案件 CRM、客資管理、帶看率與成交率分析。店長可看團隊整體進度，個人仲介可管自己的案件池。",
    tags: ["案件 CRM", "跟進提醒", "團隊管理"],
  },
  {
    icon: "📋",
    title: "代書過戶協作",
    description:
      "謄本解析、補件提醒、產權移轉節點同步。代書能在同一案件畫面看到所有待辦與文件缺口，不再用 LINE 催件。",
    tags: ["謄本解析", "補件提醒", "過戶節點"],
  },
  {
    icon: "🔒",
    title: "履約保證整合",
    description:
      "資金里程碑追蹤、付款節點提醒與履約銀行協作。合約完成後自動推送下一個里程碑給相關角色。",
    tags: ["資金里程碑", "履保追蹤", "銀行協作"],
  },
  {
    icon: "⚖️",
    title: "律師契約審閱",
    description:
      "條款風險標記、契約版本管理與爭議支援。律師可直接在平台標記條款問題並推送給相關方確認。",
    tags: ["風險標記", "契約版本", "爭議支援"],
  },
  {
    icon: "🔨",
    title: "裝修工程整合",
    description:
      "接案詢問、工期報告、驗收節點與費用追蹤。屋主、仲介與裝修團隊在同一案件流程內溝通，減少跨平台往返。",
    tags: ["接案報價", "工期追蹤", "驗收節點"],
  },
];

const aiCapabilities = [
  {
    title: "AI 產品說明書生成",
    description:
      "輸入地址、坪數與特色，AI 自動生成符合台灣買賣慣用語的物件說明書，支援繁體中文與台灣度量單位（坪）。",
  },
  {
    title: "謄本 / 建物謄本 OCR 解析",
    description:
      "上傳謄本影像，AI 自動擷取地號、建號、權利人、面積與限制登記資訊，並標記異常或需補件欄位。",
  },
  {
    title: "AI 跟進建議與待辦提醒",
    description:
      "依案件目前節點自動推薦下一步行動：「距離上次帶看已 7 天，建議跟進」、「補件逾期風險」等。",
  },
  {
    title: "多角色文件清單生成",
    description:
      "依交易類型（買賣 / 租賃）與角色（房東 / 仲介 / 代書）自動產出完整文件清單，減少遺漏與重工。",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "建立案件入口",
    description:
      "從刊登、詢問、表單與需求蒐集開始，把房東、租客、買家先帶進平台。",
  },
  {
    step: "02",
    title: "邀請專業角色",
    description:
      "依案件進度拉入仲介、代書、律師、裝修與合作單位，開始跨角色協作。",
  },
  {
    step: "03",
    title: "推進文件與節點",
    description:
      "用 AI 提醒待辦、補件、簽約與履約里程碑，避免流程卡在人工交接。",
  },
  {
    step: "04",
    title: "擴張到團隊與品牌",
    description:
      "當單點驗證完成後，再擴展為分店管理、企業報表與大型合作方案。",
  },
];

const twSpecificFeatures = [
  "台灣繁體中文介面，符合本地用語習慣",
  "「坪」與「元」為預設度量單位",
  "謄本 / 建物登記謄本 OCR 解析",
  "代書過戶節點追蹤（含補件提醒）",
  "履約保證資金里程碑整合",
  "斡旋金 / 要約書流程支援",
  "Line 通知整合（租賃催租、帶看提醒）",
  "台灣各縣市稅費試算輔助",
];

const listingTypeComparison = {
  columns: [
    { key: "ownerai" as const, label: "OwneAI + 屋主自售" },
    { key: "general" as const, label: "一般約" },
    { key: "exclusive" as const, label: "專任約" },
  ],
  rows: [
    {
      aspect: "費用負擔",
      ownerai: "平台訂閱／按物件付費為主，無須支付傳統買賣仲介佣金（除非另聘仲介）。",
      general: "多為「成交才付費」，費率依各仲介合約；可同時委託多家。",
      exclusive: "通常約定較明確的佣金比例或金額，專任期內成交多須依約給付。",
    },
    {
      aspect: "優點",
      ownerai:
        "流程與文件節點透明；AI 輔助說明書、待辦與代書銜接；成本相對可控。",
      general: "委託彈性高、可貨比多家；未完成交易時，費用壓力通常較低（視合約）。",
      exclusive: "單一窗口集中行銷與議價；仲介投入資源通常較完整，屋主較省時。",
    },
    {
      aspect: "缺點",
      ownerai:
        "屋主需參與詢問、帶看與議價節奏；法務與風險仍須審慎（平台提供輔助而非取代專業）。",
      general: "各家投注程度不一，行銷力道可能分散；多家重複帶看時資訊需自行整合。",
      exclusive: "佣金與專任拘束通常較高；期間內成交多須依約付費，彈性相對較低。",
    },
    {
      aspect: "較適合對象",
      ownerai: "願意投入時間經營案件、希望降低佣金支出、偏好數位化協作的屋主。",
      general: "想先多方接觸市場、不急於獨家曝光、希望保留較高委託彈性的屋主。",
      exclusive: "希望全權委由單一仲介主導行銷、議價與客戶經營的屋主。",
    },
  ],
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white font-urbanist">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-12 lg:px-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_28%)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <span className="mb-4 inline-flex rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2 text-sm uppercase tracking-[0.18em] text-[#C7B7FF]">
                  Platform capabilities
                </span>
                <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  台灣不動產全流程 AI 協作平台
                </h1>
                <p className="mb-8 max-w-2xl text-lg leading-8 text-[#B5B5B5]">
                  不是單一房東工具，而是把台灣買賣租賃的案件、角色、文件與流程收進同一個平台。從刊登、帶看、斡旋、簽約、代書過戶到交屋，每個節點都有 AI 輔助。
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link href="/contact?inquiryType=合作提案">
                    <Button size="lg">預約導入諮詢</Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="secondary" size="lg">
                      查看角色方案
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#2A2A2A] bg-[#1A1A1A]/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="mb-6 border-b border-[#2A2A2A] pb-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-[#7C3AED]">
                    委託型態比較
                  </p>
                  <h2 className="mt-2 text-2xl font-bold leading-snug">
                    OwneAI + 屋主自售 vs 一般約 vs 專任約
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#999999]">
                    實際權利義務以您與仲介／平台簽署之約定為準，以下為一般情境整理。
                  </p>
                </div>

                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th
                          scope="col"
                          className="sticky left-0 z-10 bg-[#1A1A1A] px-3 py-3 font-semibold text-[#CCCCCC]"
                        >
                          比較項目
                        </th>
                        {listingTypeComparison.columns.map((col) => (
                          <th
                            key={col.key}
                            scope="col"
                            className="min-w-[11rem] px-3 py-3 font-semibold text-white"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listingTypeComparison.rows.map((row) => (
                        <tr
                          key={row.aspect}
                          className="border-b border-[#262626] last:border-b-0"
                        >
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-[#161616] px-3 py-3 align-top font-semibold text-[#C7B7FF]"
                          >
                            {row.aspect}
                          </th>
                          <td className="px-3 py-3 align-top leading-6 text-[#D5D5D5]">
                            {row.ownerai}
                          </td>
                          <td className="px-3 py-3 align-top leading-6 text-[#D5D5D5]">
                            {row.general}
                          </td>
                          <td className="px-3 py-3 align-top leading-6 text-[#D5D5D5]">
                            {row.exclusive}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Role-by-role capabilities */}
        <section className="bg-[#1A1A1A] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 max-w-3xl">
              <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-[#7C3AED]">
                按角色拆解
              </span>
              <h2 className="text-3xl font-bold md:text-4xl">
                每個角色都有對應的工具，不再用單一方案硬套所有人
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rolePillars.map((pillar) => (
                <Card key={pillar.title} className="border-[#262626] bg-[#141414]">
                  <CardContent className="p-6">
                    <div className="mb-4 text-3xl">{pillar.icon}</div>
                    <h3 className="mb-3 text-xl font-bold">{pillar.title}</h3>
                    <p className="mb-4 text-sm leading-7 text-[#999999]">
                      {pillar.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pillar.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#333333] bg-[#1A1A1A] px-3 py-1 text-xs text-[#CCCCCC]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* AI Capabilities */}
        <section className="bg-[#141414] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 max-w-3xl">
              <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-[#7C3AED]">
                AI 核心能力
              </span>
              <h2 className="text-3xl font-bold md:text-4xl">
                台灣不動產流程專屬的 AI 功能
              </h2>
              <p className="mt-4 leading-7 text-[#999999]">
                不是泛用 AI 聊天，而是針對台灣代書制度、謄本格式與交易慣例深度整合的 AI 工具。
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {aiCapabilities.map((cap) => (
                <div
                  key={cap.title}
                  className="rounded-3xl border border-[#262626] bg-[#1A1A1A] p-6"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[#C7B7FF]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{cap.title}</h3>
                  <p className="leading-7 text-[#999999]">{cap.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TW-specific features */}
        <section className="bg-[#1A1A1A] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-[#7C3AED]">
                台灣本地化
              </span>
              <h2 className="mb-5 text-3xl font-bold md:text-4xl">
                專為台灣市場設計，不是翻譯版
              </h2>
              <p className="leading-7 text-[#999999]">
                從謄本解析到代書過戶、從坪數計算到履約保證，每一個功能都對應台灣不動產的真實流程，而不是泛用 SaaS 硬套。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {twSpecificFeatures.map((feat) => (
                <div
                  key={feat}
                  className="flex items-start gap-3 rounded-2xl border border-[#262626] bg-[#141414] px-4 py-3"
                >
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-[#D5D5D5]">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="bg-[#141414] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-[#7C3AED]">
                導入節奏
              </span>
              <h2 className="mb-5 text-3xl font-bold md:text-4xl">
                先用單點案件驗證，再把團隊搬進來
              </h2>
              <p className="leading-7 text-[#999999]">
                導入不需要一次全面替換。平台支援從單一仲介、單一分店或單一合作角色開始，先證明效率與成交推進價值，再往上擴張。
              </p>
            </div>

            <div className="space-y-6">
              {workflowSteps.map((item) => (
                <div
                  key={item.step}
                  className="flex gap-5 rounded-2xl border border-[#262626] bg-[#1A1A1A] p-6"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[#7C3AED] text-sm font-bold text-[#7C3AED]">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                    <p className="leading-7 text-[#999999]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-[#262626] bg-gradient-to-r from-[#141414] to-[#1A1A1A] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">
              從你最先變現的角色開始導入
            </h2>
            <p className="mx-auto mb-8 max-w-2xl leading-7 text-[#999999]">
              如果你要先切仲介、分店、代書、律師或企業合作，我們可以依你的案件流與團隊結構，先定出最小可行導入範圍。
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/contact?inquiryType=合作提案">
                <Button size="lg">預約導入諮詢</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="secondary" size="lg">查看角色方案</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
