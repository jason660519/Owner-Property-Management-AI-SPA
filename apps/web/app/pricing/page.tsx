"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/Card";

type BillingCycle = "monthly" | "yearly";

const freeRoles = ["自租房東", "租客", "買家"];

const pricingPlans = [
  {
    id: "free-entry",
    title: "免費流量入口",
    description: "給自租屋主、租客、買家免費使用，優先累積需求與案件。",
    badge: "免費角色",
    prices: { monthly: 0, yearly: 0 },
    features: [
      "自租屋主、租客、買家皆可免費建立帳號",
      "出租刊登、詢問整合、看屋安排與文件上傳",
      "基本 AI 助理、任務追蹤與訊息通知",
      "高成本 AI 功能採配額制，避免無上限濫用",
    ],
    cta: "立即開始",
    variant: "secondary" as const,
  },
  {
    id: "self-sell",
    title: "自售屋主版",
    description: "不透過仲介自行出售的屋主，按物件付費取得完整工具。",
    badge: "按物件計費",
    prices: { monthly: 800, yearly: 7680 },
    secondaryPrice: "或每刊登物件 NT$500 - NT$1,200（一次性）",
    features: [
      "物件刊登、AI 產品說明書生成與帶看管理",
      "詢問整合、買方資格初篩與意願追蹤",
      "斡旋金 / 要約書流程支援",
      "代書與律師協作節點銜接",
    ],
    cta: "查看自售方案",
    variant: "secondary" as const,
  },
  {
    id: "agent-pro",
    title: "仲介個人版",
    description: "給不動產營業員與經紀人使用的案件工作台。",
    badge: "按案件 / 月費",
    prices: { monthly: 1500, yearly: 15300 },
    secondaryPrice: "或每活躍案件 NT$300 - NT$800",
    features: [
      "案件 CRM、客資管理與帶看進度追蹤",
      "AI 跟進建議、待辦提醒與節點推進",
      "與房東、買家、租客、代書跨角色協作",
      "文件清單與簽約前後狀態總覽",
    ],
    cta: "預約仲介方案",
    variant: "primary" as const,
    popular: true,
  },
  {
    id: "store-management",
    title: "分店管理版",
    description: "給房仲店長、加盟主與老闆的團隊管理方案。",
    badge: "團隊方案",
    prices: { monthly: 6000, yearly: 61200 },
    secondaryPrice: "超額席次與超額案件量另計",
    features: [
      "分店案件池、名單分配與主管總覽",
      "團隊成交率、帶看率、跟進率分析",
      "角色權限、SOP 稽核與協作紀錄",
      "適合中小型團隊先導入，再逐步擴張",
    ],
    cta: "洽談分店導入",
    variant: "secondary" as const,
  },
  {
    id: "enterprise",
    title: "企業合作版",
    description: "給履約保證銀行、大型房仲品牌與合作通路。",
    badge: "客製報價",
    customLabel: "洽談",
    features: [
      "履約節點、文件審核與資金里程碑監控",
      "企業級報表、稽核與 API 串接",
      "導入顧問、權限模型與專屬合作流程",
      "適合大型品牌與金融合作夥伴",
    ],
    cta: "聯絡企業合作",
    variant: "secondary" as const,
  },
];

const servicePricing = [
  {
    role: "過戶代書",
    pricing: "每案件 NT$500 - NT$1,500",
    note: "文件清單、補件提醒、過戶節點同步",
  },
  {
    role: "律師",
    pricing: "每案件 NT$1,500 - NT$5,000",
    note: "契約審閱、條款風險標記、爭議支援",
  },
  {
    role: "裝修團隊",
    pricing: "每專案 NT$500 - NT$2,000",
    note: "接案、報價、工期回報、驗收節點",
  },
];

const comparisonRows = [
  {
    label: "適用角色",
    values: [
      "自租屋主 / 租客 / 買家",
      "仲介個人",
      "店長 / 老闆",
      "銀行 / 大型合作方",
    ],
  },
  {
    label: "收費方式",
    values: [
      "免費",
      "按案件或月費",
      "按分店 / 席次 / 案件量",
      "年度合約 / 客製報價",
    ],
  },
  {
    label: "主要價值",
    values: [
      "建立案件與需求入口",
      "成交推進與案件協作",
      "團隊管理與營運可視化",
      "履約監控與企業整合",
    ],
  },
  {
    label: "AI 配額",
    values: ["基本配額", "進階工作流", "團隊共享配額", "客製額度"],
  },
  {
    label: "跨角色協作",
    values: [
      "可被邀請進入案件",
      "可主動建立協作",
      "可分派與稽核",
      "可接 API / 稽核報表",
    ],
  },
];

const faqs = [
  {
    question: "為什麼自租屋主、租客、買家免費，自售屋主要收費？",
    answer:
      "自租屋主、租客、買家進場是為了建立需求池與案件流；自售屋主則是有明確交易目的的主動方，需要 AI 文案、斡旋追蹤、代書協作等完整工具，因此採按物件或月費方式收費，確保服務品質。",
  },
  {
    question: "仲介一定要買月費嗎？",
    answer:
      "不一定。平台優先支援按案件或按物件收費，讓個人仲介可先用小額方式驗證；穩定使用後再升級月費方案。",
  },
  {
    question: "代書、律師、裝修團隊為什麼不放在主方案卡？",
    answer:
      "這三類角色更適合按案件計價，而非固定月費，因此以專業服務價格表呈現，後續再視合作深度升級為月費或企業方案。",
  },
  {
    question: "高成本 AI 功能如何計價？",
    answer:
      "OCR、批量文件解析（謄本 / 建物謄本）、進階 AI 協作與大量內容生成會採配額或加購設計，避免免費層無限制消耗成本。",
  },
  {
    question: "年付方案有哪些優惠？",
    answer:
      "年付方案相當於月付 × 10.2 個月，等同享有近兩個月免費。適合已確認案件量穩定、想鎖定成本的仲介個人或分店。",
  },
];

function formatPrice(amount: number, cycle: BillingCycle) {
  if (amount === 0) return "NT$0";
  return `NT$${new Intl.NumberFormat("zh-TW").format(amount)}`;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="min-h-screen bg-[#141414] text-white font-urbanist">
      <Header />

      <main>
        <section className="pt-32 pb-20 px-6 md:px-12 lg:px-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED] rounded-full blur-[150px] opacity-20 -z-10"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7C3AED] rounded-full blur-[120px] opacity-10 -z-10"></div>

          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              從免費流量入口到
              <span className="text-[#7C3AED]">專業協作方案</span>
            </h1>
            <p className="text-[#999999] text-lg max-w-2xl mx-auto mb-4">
              房東、租客、買家先免費使用；仲介、店長、老闆與合作專業角色按案件或按方案付費。
            </p>
            <p className="text-[#999999] text-base max-w-2xl mx-auto mb-8">
              自租屋主、租客、買家免費；自售屋主按物件付費；仲介、店長與專業角色按方案付費。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="inline-flex rounded-full border border-[#262626] bg-[#1A1A1A] p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${billingCycle === "monthly" ? "bg-[#7C3AED] text-white" : "text-[#999999]"}`}
                >
                  月付
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${billingCycle === "yearly" ? "bg-[#7C3AED] text-white" : "text-[#999999]"}`}
                >
                  年付（省 2 個月）
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 text-sm text-[#CCCCCC]">
              {freeRoles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-[#262626] bg-[#1A1A1A] px-4 py-2"
                >
                  {role}免費
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {pricingPlans.map((plan) => (
              <div key={plan.id} className="relative group">
                <Card
                  className={`h-full flex flex-col border-[#262626] bg-[#1A1A1A] relative overflow-hidden transition-all duration-300 ${plan.popular ? "border-[#7C3AED] shadow-[0_0_24px_rgba(124,58,237,0.12)]" : "hover:border-[#7C3AED]/50"}`}
                >
                  <CardHeader className="text-center pb-2 pt-6">
                    {"badge" in plan && plan.badge && (
                      <div className="flex justify-center mb-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${plan.popular ? "bg-[#7C3AED] text-white" : "bg-[#262626] text-[#CCCCCC]"}`}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    )}
                    {plan.popular && (
                      <div className="flex justify-center mb-2">
                        <span className="bg-[#7C3AED] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          最受歡迎
                        </span>
                      </div>
                    )}
                    <CardTitle className="text-2xl font-bold">
                      {plan.title}
                    </CardTitle>
                    <CardDescription className="text-[#999999] mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow flex flex-col items-center pt-6">
                    {"customLabel" in plan && plan.customLabel ? (
                      <div className="flex items-baseline mb-8">
                        <span className="text-4xl md:text-5xl font-bold">
                          {plan.customLabel}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline mb-3">
                          <span className="text-4xl md:text-5xl font-bold">
                            {formatPrice((plan as { prices: Record<BillingCycle, number> }).prices[billingCycle], billingCycle)}
                          </span>
                          <span className="text-[#999999] ml-2">
                            {billingCycle === "monthly" ? "/ 月" : "/ 年"}
                          </span>
                        </div>
                        {"secondaryPrice" in plan && plan.secondaryPrice && (
                          <p className="text-sm text-[#999999] mb-8 text-center">
                            {plan.secondaryPrice}
                          </p>
                        )}
                        {!("secondaryPrice" in plan) && (
                          <div className="mb-8" />
                        )}
                      </>
                    )}

                    <ul className="w-full space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center text-sm text-[#CCCCCC]"
                        >
                          <svg
                            className="w-5 h-5 text-[#7C3AED] mr-3 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Link
                      href="/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88"
                      className="w-full"
                    >
                      <Button
                        variant={plan.variant === "primary" ? "primary" : "secondary"}
                        className="w-full"
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Professional service pricing */}
        <section className="pb-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto rounded-3xl border border-[#262626] bg-[#1A1A1A] p-6 md:p-8">
            <div className="flex flex-col gap-3 mb-8">
              <span className="text-sm uppercase tracking-[0.2em] text-[#7C3AED]">
                按案件角色
              </span>
              <h2 className="text-3xl font-bold">專業服務角色價格帶</h2>
              <p className="text-[#999999] max-w-3xl">
                代書、律師與裝修團隊更適合採按案件或按專案計價。這些角色會隨著平台案件量成長，再逐步擴張為月費或企業合作方案。
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#262626] text-sm text-[#999999]">
                    <th className="py-4 pr-4 font-medium">角色</th>
                    <th className="py-4 pr-4 font-medium">價格帶（TWD）</th>
                    <th className="py-4 font-medium">主要價值</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePricing.map((service) => (
                    <tr
                      key={service.role}
                      className="border-b border-[#262626] last:border-b-0"
                    >
                      <td className="py-4 pr-4 font-semibold text-white">
                        {service.role}
                      </td>
                      <td className="py-4 pr-4 text-[#CCCCCC]">
                        {service.pricing}
                      </td>
                      <td className="py-4 text-[#999999]">{service.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="pb-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto rounded-3xl border border-[#262626] bg-[#101010] p-6 md:p-8 overflow-hidden">
            <div className="flex flex-col gap-3 mb-8">
              <span className="text-sm uppercase tracking-[0.2em] text-[#7C3AED]">
                方案比較
              </span>
              <h2 className="text-3xl font-bold">
                一頁看懂每一層方案的角色與價值
              </h2>
              <p className="text-[#999999] max-w-3xl">
                平台不是把所有人都塞進同一種收費邏輯，而是依角色在流程中的位置分層。免費角色負責導流，專業角色負責承接與變現。
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#262626] text-sm text-[#999999]">
                    <th className="py-4 pr-4 font-medium">比較項目</th>
                    <th className="py-4 pr-4 font-medium">免費入口</th>
                    <th className="py-4 pr-4 font-medium">仲介個人版</th>
                    <th className="py-4 pr-4 font-medium">分店管理版</th>
                    <th className="py-4 font-medium">企業合作版</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-[#262626] last:border-b-0 align-top"
                    >
                      <td className="py-4 pr-4 font-semibold text-white">
                        {row.label}
                      </td>
                      {row.values.map((value) => (
                        <td
                          key={`${row.label}-${value}`}
                          className="py-4 pr-4 text-[#CCCCCC]"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-6 md:px-12 lg:px-20 border-t border-[#262626] bg-[#141414]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">常見問題</h2>
            <div className="space-y-6 text-left max-w-2xl mx-auto">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="bg-[#1A1A1A] p-6 rounded-xl border border-[#262626]"
                >
                  <h3 className="text-lg font-bold mb-2">{faq.question}</h3>
                  <p className="text-[#999999]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24 px-6 md:px-12 lg:px-20 bg-[#141414]">
          <div className="max-w-5xl mx-auto rounded-[32px] border border-[#262626] bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-8 md:p-10 text-center">
            <span className="inline-flex px-4 py-2 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#C7B7FF] text-sm uppercase tracking-[0.18em] mb-6">
              Start with the role you monetize first
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              如果你是仲介、店長、代書或合作品牌，
              <br />
              現在就可以開始談導入
            </h2>
            <p className="text-[#999999] max-w-3xl mx-auto mb-8 leading-7">
              平台已經不是單純刊登工具，而是把案件、文件、角色與節點收斂到同一個工作流。你可以先從單一案件、單一仲介或單一分店開始，不必一次性全面導入。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88">
                <Button variant="primary" size="lg">
                  預約方案洽談
                </Button>
              </Link>
              <Link href="/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88">
                <Button variant="secondary" size="lg">
                  索取銷售簡報
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
