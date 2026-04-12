import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TUTORIAL_DATA, TUTORIAL_ROLES } from '@/lib/tutorial-data';

export const metadata: Metadata = {
  title: '產品教學 | Owner AI — 台灣不動產 AI 協作平台',
  description:
    '按角色分類的 Owner AI 產品教學。選擇你的角色（房東、租客、買家），一步步了解如何使用平台的核心功能。',
};

export default function TutorialPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg-primary py-16 px-4">
        {/* Hero */}
        <section className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold text-text-primary mb-4">產品教學</h1>
          <p className="text-lg text-text-secondary">
            選擇你的角色，開始了解 Owner AI 的核心功能。每個教學步驟都附有說明與截圖，完成全部步驟即可獲得完成徽章。
          </p>
        </section>

        {/* Role cards */}
        <section
          aria-label="選擇教學角色"
          className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {TUTORIAL_ROLES.map((role) => {
            const config = TUTORIAL_DATA[role];
            return (
              <Link
                key={role}
                href={`/tutorial/${role}`}
                className="block rounded-2xl border border-border-default bg-bg-secondary p-8 hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label={`開始${config.label}教學`}
              >
                <div className="text-5xl mb-4" aria-hidden="true">
                  {config.icon}
                </div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">{config.label}</h2>
                <p className="text-sm text-text-secondary mb-4">{config.description}</p>
                <span className="text-sm font-medium text-accent">
                  {config.steps.length} 個教學步驟 →
                </span>
              </Link>
            );
          })}
        </section>

        {/* How it works */}
        <section className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">如何使用教學</h2>
          <ol className="space-y-4 list-none">
            {[
              { step: '01', text: '選擇符合你身份的角色（房東、租客或買家）' },
              { step: '02', text: '依序閱讀每個教學步驟，搭配截圖理解操作流程' },
              { step: '03', text: '點擊各步驟的「體驗功能」連結，直接在平台試用' },
              { step: '04', text: '完成所有步驟後，解鎖完成徽章，教學進度自動儲存' },
            ].map(({ step, text }) => (
              <li key={step} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm">
                  {step}
                </span>
                <p className="text-text-secondary pt-2">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
