import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getProperties } from '@/lib/api/properties';
import {
  Home, Users, Search, FileText, Wrench, Building2,
  ArrowRight, CheckCircle, Zap, Shield, TrendingUp,
  Star, ChevronRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Owner AI — 台灣不動產交易與租賃 AI 協作平台',
  description:
    '服務房東、租客、買家、仲介、代書與律師的台灣不動產 AI 協作平台。自租屋主、租客、買家免費；自售屋主按物件付費；仲介、代書與律師等專業角色按方案付費。',
  keywords: ['不動產', '房地產', 'AI', '房東', '租客', '買家', '仲介', '代書', '台灣'],
  openGraph: {
    title: 'Owner AI — 台灣不動產交易與租賃 AI 協作平台',
    description: '從刊登、帶看、斡旋、簽約、代書過戶到維修，全流程在同一個協作環境完成。',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'Owner AI',
  },
};

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Role definitions — shown as entry-point cards on the homepage
// ---------------------------------------------------------------------------
const roles = [
  {
    icon: <Home className="w-6 h-6" />,
    title: '自租屋主',
    desc: '免費刊登出租物件、整理詢問、安排帶看、追蹤租約與點交進度，全程零仲介費。',
    cta: '自租免費開始',
    href: '/register?role=landlord',
    free: true,
    color: 'from-blue-500/20 to-blue-600/5',
    accent: 'text-blue-400',
    border: 'hover:border-blue-500/40',
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: '自售屋主',
    desc: '不透過仲介自行出售，AI 產品說明書、帶看追蹤、斡旋管理、代書協作一站完成。',
    cta: '查看自售方案',
    href: '/pricing',
    free: false,
    color: 'from-cyan-500/20 to-cyan-600/5',
    accent: 'text-cyan-400',
    border: 'hover:border-cyan-500/40',
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: '租客 / 買家',
    desc: '找房、預約看屋、送出申請、追蹤合約與交屋進度，所有步驟在同一個入口完成。',
    cta: '免費搜尋物件',
    href: '/properties',
    free: true,
    color: 'from-green-500/20 to-green-600/5',
    accent: 'text-green-400',
    border: 'hover:border-green-500/40',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: '仲介 / 營業員',
    desc: '案件 CRM、AI 跟進建議、帶看節點追蹤、與買賣雙方及代書跨角色協作。',
    cta: '查看仲介方案',
    href: '/pricing#agent',
    free: false,
    color: 'from-purple-500/20 to-purple-600/5',
    accent: 'text-purple-400',
    border: 'hover:border-purple-500/40',
  },
  {
    icon: <Building2 className="w-6 h-6" />,
    title: '店長 / 老闆',
    desc: '分店案件池、業績分析、名單分派、成交率與帶看率追蹤，讓管理不靠人工匯報。',
    cta: '查看分店方案',
    href: '/pricing#store',
    free: false,
    color: 'from-orange-500/20 to-orange-600/5',
    accent: 'text-orange-400',
    border: 'hover:border-orange-500/40',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: '過戶代書',
    desc: '案件接收、過戶文件清單、補件提醒、與買賣雙方及銀行的協作入口。',
    cta: '查看代書方案',
    href: '/pricing#pro',
    free: false,
    color: 'from-yellow-500/20 to-yellow-600/5',
    accent: 'text-yellow-400',
    border: 'hover:border-yellow-500/40',
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    title: '裝修 / 服務商',
    desc: '從平台接收維修與裝修 Lead，管理報價、工期回報與驗收里程碑。',
    cta: '查看服務商方案',
    href: '/pricing#pro',
    free: false,
    color: 'from-red-500/20 to-red-600/5',
    accent: 'text-red-400',
    border: 'hover:border-red-500/40',
  },
];

// ---------------------------------------------------------------------------
// Workflow steps — TW transaction flow
// ---------------------------------------------------------------------------
const workflow = [
  { step: '01', phase: '刊登與詢問', desc: '自租屋主免費刊登，自售屋主按物件付費，AI 自動整理詢問與預約，篩選有效意願。' },
  { step: '02', phase: '帶看安排', desc: '線上預約系統、看屋紀錄、來訪意願評分，省去大量電話溝通。' },
  { step: '03', phase: '斡旋與出價', desc: '買賣雙方在平台上送出意願書、追蹤斡旋進度、確認成交價格。' },
  { step: '04', phase: '簽約與審閱', desc: 'AI 輔助合約草稿，律師線上審閱條款，電子簽署一站完成。' },
  { step: '05', phase: '代書過戶', desc: '過戶文件清單、補件追蹤、銀行貸款節點，代書直接在平台協作。' },
  { step: '06', phase: '交屋與維修', desc: '交屋前後待辦清單、維修申請、裝修報價，長期管理不斷線。' },
];

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
const features = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'AI 驅動全流程',
    desc: 'OCR 自動辨識謄本與地籍，AI 生成物件文案，智慧跟進建議，讓每個角色都省時省力。',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: '多角色同一案件',
    desc: '買家、賣家、仲介、代書、律師在同一個案件畫面協作，不再靠 LINE 群組傳檔案。',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: '文件安全儲存',
    desc: '謄本、權狀、合約加密儲存，各角色依權限存取，稽核紀錄完整可追溯。',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: '數據可視化管理',
    desc: '帶看率、成交率、跟進率即時分析，讓店長與屋主都能掌握案件轉化全貌。',
  },
];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
const stats = [
  { value: '9+', label: '支援角色類型' },
  { value: '免費', label: '自租屋主 / 租客 / 買家' },
  { value: 'AI', label: 'OCR + 文案 + 跟進建議' },
  { value: '全流程', label: '刊登到交屋一站完成' },
];

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
const faqs = [
  {
    q: '自租屋主可以完全免費使用嗎？',
    a: '是的。自租屋主可以免費刊登出租物件、整理詢問、安排帶看與追蹤租約進度。高成本 AI 功能（如 OCR 批量辨識、進階 AI 文案）有免費配額，超出後可加購。自售屋主則採按物件付費，享有完整的買賣流程工具與代書協作功能。',
  },
  {
    q: '仲介加入後能做到什麼？',
    a: '仲介個人版提供案件 CRM、客資管理、AI 跟進建議、帶看節點追蹤、以及與屋主、買家、代書的跨角色協作入口。支援按月費或按案件計費，靈活選擇。',
  },
  {
    q: '代書怎麼使用這個平台？',
    a: '代書可以透過平台接收案件、管理過戶文件清單、追蹤補件進度、設定交屋節點，並與買賣雙方、仲介、銀行直接協作，告別靠 LINE/Email 傳文件的作業方式。',
  },
  {
    q: '這個平台和傳統仲介有什麼不同？',
    a: '我們不是仲介，我們是協作平台。屋主可以選擇自售或透過仲介，租客可以直接找房或由仲介帶看，平台負責把各方流程串接起來，讓案件推進更透明、更有效率。',
  },
  {
    q: '安全性有保障嗎？',
    a: '所有文件加密儲存於雲端，各角色依 IAM 權限存取，所有操作留有稽核紀錄。符合台灣個資法要求，資料不會被用於任何廣告目的。',
  },
];

export default async function HomePage() {
  const { properties } = await getProperties().catch(() => ({ properties: [], isMock: true }));
  const featuredProperties = properties.slice(0, 3);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-primary">
      <Header />

      <main>
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20 overflow-hidden">
          {/* background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" /> 台灣不動產 AI 協作平台
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
              找房、刊登、成交、過戶<br />
              <span className="text-accent">全流程在同一個平台</span>
            </h1>

            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              自租屋主、租客、買家免費；自售屋主按物件付費；仲介、代書、律師按方案付費。
              讓台灣不動產交易從刊登到交屋，不再靠 LINE 群組推進案件。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-base transition-all shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5"
              >
                免費開始使用 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border-default hover:border-accent text-text-secondary hover:text-text-primary font-semibold text-base transition-all"
              >
                瀏覽物件列表
              </Link>
            </div>

            {/* Quick proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-text-muted">
              {['屋主免費刊登', '仲介 AI 跟進', '代書一站協作', '不需信用卡'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-400" /> {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-12 px-6 md:px-12 lg:px-20 border-y border-border-default bg-bg-secondary/50">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-accent mb-1">{s.value}</p>
                <p className="text-sm text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Roles ── */}
        <section className="py-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">你是哪種角色？</h2>
              <p className="text-text-muted max-w-xl mx-auto">
                不管你是屋主、仲介、租客還是代書，找到你的專屬入口。
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Link
                  key={role.title}
                  href={role.href}
                  className={`group relative flex flex-col p-6 rounded-2xl border border-border-default ${role.border} bg-gradient-to-br ${role.color} transition-all duration-200 hover:-translate-y-1 hover:shadow-card`}
                >
                  {role.free && (
                    <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                      免費
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center mb-4 ${role.accent}`}>
                    {role.icon}
                  </div>
                  <h3 className="font-semibold text-text-primary text-lg mb-2">{role.title}</h3>
                  <p className="text-sm text-text-muted flex-1 leading-relaxed">{role.desc}</p>
                  <div className={`flex items-center gap-1 mt-4 text-sm font-medium ${role.accent}`}>
                    {role.cta} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Workflow ── */}
        <section className="py-20 px-6 md:px-12 lg:px-20 bg-bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">台灣不動產全流程</h2>
              <p className="text-text-muted max-w-xl mx-auto">
                從第一通詢問到交屋後的維修，每個節點都在平台上完成，不靠 LINE 群組推進。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflow.map((w, i) => (
                <div
                  key={w.step}
                  className="relative flex gap-4 p-5 rounded-xl border border-border-default bg-bg-secondary"
                >
                  <span className="text-3xl font-bold text-accent/20 leading-none shrink-0 select-none">
                    {w.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">{w.phase}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{w.desc}</p>
                  </div>
                  {i < workflow.length - 1 && (
                    <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-border-default">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">為什麼選擇 Owner AI？</h2>
              <p className="text-text-muted max-w-xl mx-auto">
                不只是刊登平台，而是讓交易各方都能在同一條流程上高效推進的協作工具。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4 p-6 rounded-xl border border-border-default bg-bg-secondary">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">{f.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Properties preview ── */}
        {featuredProperties.length > 0 && (
          <section className="py-20 px-6 md:px-12 lg:px-20 bg-bg-secondary/30">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-text-primary mb-2">最新上架物件</h2>
                  <p className="text-text-muted">由屋主直接刊登，資訊透明無仲介抽成。</p>
                </div>
                <Link
                  href="/properties"
                  className="hidden md:flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  查看全部 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {featuredProperties.map((p) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="group rounded-xl border border-border-default bg-bg-secondary overflow-hidden hover:border-accent transition-colors"
                  >
                    <div className="h-44 bg-bg-tertiary flex items-center justify-center">
                      <Home className="w-8 h-8 text-border-default" />
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-text-primary truncate">{p.title || p.address}</p>
                      <p className="text-sm text-text-muted mt-0.5 truncate">{p.address}</p>
                      <p className="text-accent font-semibold mt-2">
                        NT$ {p.rawPrice.toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center md:hidden">
                <Link href="/properties" className="text-sm text-accent hover:underline">
                  查看全部物件 →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section className="py-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">常見問題</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-border-default bg-bg-secondary overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-text-primary font-medium list-none">
                    {faq.q}
                    <ChevronRight className="w-4 h-4 text-text-muted group-open:rotate-90 transition-transform shrink-0 ml-4" />
                  </summary>
                  <div className="px-6 pb-4 text-sm text-text-muted leading-relaxed border-t border-border-default pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-accent/10 via-transparent to-transparent">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              準備好了嗎？
            </h2>
            <p className="text-text-muted text-lg mb-8">
              自租屋主、租客、買家免費；自售屋主按物件付費，仲介與代書 14 天免費試用。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold transition-all shadow-lg hover:shadow-accent/25"
              >
                立即免費開始 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border-default hover:border-accent text-text-secondary hover:text-text-primary font-semibold transition-all"
              >
                聯絡我們諮詢
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
