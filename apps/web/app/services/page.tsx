"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

const servicePillars = [
  {
    title: "仲介與分店營運",
    description:
      "集中管理案件池、客資分派、帶看節點與成交率分析，讓個人仲介與店長共用同一套工作流。",
  },
  {
    title: "代書與律師協作",
    description:
      "把契約、補件、風險審閱與交屋前後節點整合進單一案件畫面，降低跨單位溝通成本。",
  },
  {
    title: "買賣租三端入口",
    description:
      "自售房東、自租房東、買家與租客先免費進場，平台再把案件導入專業角色完成轉換。",
  },
  {
    title: "銀行與企業合作",
    description:
      "履約保證、品牌通路與大型房仲可透過企業方案串接稽核節點、報表與內部 SOP。",
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
      "當單點驗證完成後，再擴展為分店管理、企業報表與跨市場合作方案。",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white font-urbanist">
      <Header />

      <main>
        <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-12 lg:px-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_28%)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <span className="mb-4 inline-flex rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2 text-sm uppercase tracking-[0.18em] text-[#C7B7FF]">
                  Platform capabilities
                </span>
                <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  多角色不動產 AI 協作平台能力
                </h1>
                <p className="mb-8 max-w-2xl text-lg leading-8 text-[#B5B5B5]">
                  這不是單一房東工具，而是把案件、角色、文件與流程收進同一個平台。你可以先從免費入口導流，再讓付費角色在同一條工作流裡接手成交與履約。
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link href="/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88">
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
                <div className="mb-6 flex items-center justify-between border-b border-[#2A2A2A] pb-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[#7C3AED]">
                      Workflow snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      角色在同一條案件線上接力
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#2E3B2E] bg-[#1A241A] px-3 py-1 text-sm text-[#79E2A0]">
                    Free + Paid
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    "房東 / 買家建立需求",
                    "仲介接手推進",
                    "代書 / 律師補件簽約",
                    "銀行 / 品牌追蹤履約",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-[#262626] bg-[#121212] px-5 py-4 text-sm text-[#D5D5D5]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1A1A1A] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 max-w-3xl">
              <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.18em] text-[#7C3AED]">
                核心能力
              </span>
              <h2 className="text-3xl font-bold md:text-4xl">
                按角色拆解，不再用單一方案硬套所有人
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {servicePillars.map((pillar) => (
                <Card
                  key={pillar.title}
                  className="border-[#262626] bg-[#141414]"
                >
                  <CardContent className="p-8">
                    <h3 className="mb-4 text-2xl font-bold">{pillar.title}</h3>
                    <p className="leading-7 text-[#999999]">
                      {pillar.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

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
                    <p className="leading-7 text-[#999999]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#262626] bg-gradient-to-r from-[#141414] to-[#1A1A1A] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">
              從你最先變現的角色開始導入
            </h2>
            <p className="mx-auto mb-8 max-w-2xl leading-7 text-[#999999]">
              如果你要先切仲介、分店、代書、律師或企業合作，我們可以依你的案件流與團隊結構，先定出最小可行導入範圍。
            </p>
            <div className="flex justify-center">
              <Link href="/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88">
                <Button size="lg">預約導入諮詢</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
