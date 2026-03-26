import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "關於我們 | Owner AI — 台灣不動產 AI 協作平台",
  description:
    "Owner AI 將台灣的自售屋主、買家、租客、仲介、代書與合作專業服務團隊放進同一條不動產協作流程，從刊登到交屋全程在同一平台完成。",
};

const marketHighlights = [
  {
    label: "聚焦台灣",
    value: "全台覆蓋",
    description: "專為台灣買賣慣例、代書制度、履約保證與謄本流程設計，不是舶來品改裝。",
  },
  {
    label: "多角色",
    value: "9+ 角色",
    description: "從自售屋主到履約保證銀行，都能進入同一個案件協作流程。",
  },
  {
    label: "收入模型",
    value: "按案件 / 物件",
    description: "先讓流量角色免費進場，再向仲介、代書、律師與合作團隊收費變現。",
  },
];

const roleGroups = [
  {
    title: "免費流量入口",
    description: "先讓有需求的人進場，降低買方、租客與自租屋主的使用門檻。",
    items: ["自租屋主", "租客", "買家"],
  },
  {
    title: "核心付費角色",
    description: "讓第一線成交與營運角色用案件效率、導流品質與管理能力買單。",
    items: ["自售屋主", "仲介", "店長 / 老闆"],
  },
  {
    title: "專業協作角色",
    description:
      "把簽約、法務、裝修與履保節點接到同一條流程，讓案件真正能走完。",
    items: ["代書", "律師", "裝修團隊", "履約保證銀行"],
  },
];

const principles = [
  {
    title: "先導流，再成交",
    description:
      "先讓案件與需求可見，再把專業服務接到正確節點，避免每個角色各做各的。",
  },
  {
    title: "同一案件，同一語境",
    description:
      "價格、謄本、文件、角色分工與下一步都在同一頁面理解，不再分散在聊天工具與試算表。",
  },
  {
    title: "從 AI 助理走向交易作業系統",
    description:
      "不只回答問題，而是把導流、協作、代書過戶、簽約與後續服務串成可持續優化的產品。",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "案件建立",
    description:
      "屋主、仲介或團隊先把案件上架，定義目前處於買賣或租賃哪一個節點。",
  },
  {
    step: "02",
    title: "角色加入",
    description:
      "買家、租客、代書、律師與裝修角色依案件狀態加入，不需要重複蒐集背景資訊。",
  },
  {
    step: "03",
    title: "AI 協作推進",
    description:
      "平台用 AI 提醒文件缺口、下一步任務與適合介入的專業角色，縮短成交與交屋週期。",
  },
];

const supportLanes = [
  "角色定價與商業模式設計",
  "公開案件市場與合作導流",
  "代書 / 履約保證節點整合",
  "團隊導入與 CRM 串接需求盤點",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white font-urbanist">
      <Header />

      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-32 md:px-12 lg:px-20">
          <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.02),_rgba(17,17,17,0))]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <span className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm tracking-[0.2em] text-[#F5C96A] uppercase">
                About Owner AI
              </span>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                我們正在重做台灣不動產服務的協作底層
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#B8B8B8]">
                一個案件，讓買賣方、租賃方與專業角色共用同一條協作節奏。Owner AI
                不再只是房東工具，而是把自售屋主、自租屋主、買家、租客、仲介、代書、律師與合作團隊接進同一個台灣不動產 AI 協作平台。
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/pricing">
                  <Button size="lg">查看角色定價</Button>
                </Link>
                <Link href="/contact?inquiryType=合作提案">
                  <Button variant="secondary" size="lg">
                    預約平台導入
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-sm md:p-8">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-[#2B2B2B] bg-[#171717] p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#8E8E8E]">
                    市場策略
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    深耕台灣市場
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#A0A0A0]">
                    專為台灣買賣慣例與代書制度打造，驗證高頻交易協作與多角色 SaaS 定價模型。
                  </p>
                </div>
                <div className="rounded-2xl border border-[#2B2B2B] bg-[#171717] p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#8E8E8E]">
                    商業模式
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    買方、租客、自租屋主先免費進場
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#A0A0A0]">
                    先把需求聚集，再向仲介、店長、代書、律師與合作團隊收取按案件或按物件費用。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-10 md:px-12 lg:px-20">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            {marketHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-[#171717] p-6"
              >
                <p className="text-sm uppercase tracking-[0.18em] text-[#8E8E8E]">
                  {item.label}
                </p>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {item.value}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#A0A0A0]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#151515] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.2em] text-[#F5C96A]">
                Role Architecture
              </p>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                把不同角色放進同一個案件生命週期
              </h2>
              <p className="mt-5 text-base leading-8 text-[#A8A8A8]">
                我們把市場上原本斷裂的角色拆成三層：先進場的人、直接成交的人、以及把案件推完的專業協作者。
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {roleGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-3xl border border-white/10 bg-[#101010] p-6"
                >
                  <h3 className="text-2xl font-semibold text-white">
                    {group.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#A0A0A0]">
                    {group.description}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-[#E9E9E9]">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#F5C96A]">
                Operating Principles
              </p>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                我們怎麼看待這個產品
              </h2>
              <p className="mt-5 text-base leading-8 text-[#A8A8A8]">
                不是再做一個漂亮的刊登頁，而是建立一套能真正承接成交、代書過戶與後續服務的台灣不動產作業流程。
              </p>
            </div>

            <div className="grid gap-5">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-3xl border border-white/10 bg-[#171717] p-6"
                >
                  <h3 className="text-xl font-semibold text-white">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#A0A0A0]">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,_#151515_0%,_#111111_100%)] px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.2em] text-[#F5C96A]">
                  Workflow
                </p>
                <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                  從公開案件到成交協作，我們希望流程長這樣
                </h2>
              </div>
              <Link
                className="text-sm text-[#F5C96A] underline-offset-4 hover:underline"
                href="/properties"
              >
                查看案件市場
              </Link>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {workflowSteps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-3xl border border-white/10 bg-[#101010] p-6"
                >
                  <p className="text-sm font-semibold tracking-[0.2em] text-[#F5C96A]">
                    {step.step}
                  </p>
                  <h3 className="mt-6 text-2xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#A0A0A0]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(245,158,11,0.08),_rgba(14,165,233,0.08))] p-8 md:p-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#F5C96A]">
                Need Help
              </p>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                如果你想把團隊、案件或服務接進平台
              </h2>
              <p className="mt-5 text-base leading-8 text-[#C9C9C9]">
                這一頁不做空泛品牌故事。我們更想直接告訴你，平台目前能支援什麼、下一步能一起盤什麼。
              </p>
            </div>

            <div className="grid gap-4">
              {supportLanes.map((lane) => (
                <div
                  key={lane}
                  className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-white"
                >
                  {lane}
                </div>
              ))}

              <div className="mt-4 flex flex-wrap gap-4">
                <Link href="/contact?inquiryType=合作提案">
                  <Button size="lg">預約平台導入</Button>
                </Link>
                <Link href="/services">
                  <Button variant="secondary" size="lg">
                    查看平台能力
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
