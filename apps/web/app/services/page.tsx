'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function ServicesPage() {
    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main>
                {/* Hero Section */}
                <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            src="/images/services-hero.jpg"
                            alt="Services Hero"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">全方位的物業管理服務</h1>
                        <p className="text-[#999999] text-lg max-w-2xl mx-auto mb-8">
                            我們結合最新的 AI 技術與專業的物業管理團隊，為您提供高效、透明且無憂的資產管理體驗。
                        </p>
                        <Button size="lg">立即諮詢</Button>
                    </div>
                </section>

                {/* Services Grid */}
                <section className="py-20 px-6 md:px-12 lg:px-20 bg-[#1A1A1A]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <span className="text-[#7C3AED] font-semibold tracking-wider uppercase text-sm mb-2 block">我們的專業</span>
                            <h2 className="text-3xl md:text-4xl font-bold">為您量身打造的解決方案</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                {
                                    title: '物業代管',
                                    desc: '從日常維護到租金收取，我們處理所有繁瑣細節，讓您輕鬆當房東。',
                                    icon: (
                                        <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    )
                                },
                                {
                                    title: '租務管理',
                                    desc: '嚴格的房客篩選、合約簽署到退租點交，全程法律保障，降低租賃風險。',
                                    icon: (
                                        <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )
                                },
                                {
                                    title: '維修服務',
                                    desc: '擁有專業維修團隊，提供 24/7 緊急報修服務，快速解決設備故障問題。',
                                    icon: (
                                        <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                        </svg>
                                    )
                                },
                                {
                                    title: '財務報表',
                                    desc: '透過 App 隨時查看收入支出明細，自動生成月度與年度財務報表，報稅更輕鬆。',
                                    icon: (
                                        <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    )
                                },
                                {
                                    title: '市場分析',
                                    desc: '利用大數據分析區域租金行情，提供專業定價建議，最大化您的投資回報。',
                                    icon: (
                                        <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                        </svg>
                                    )
                                },
                                {
                                    title: '法律諮詢',
                                    desc: '專業法務團隊提供租賃法規諮詢，協助處理租賃糾紛，保障您的權益。',
                                    icon: (
                                        <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                    )
                                }
                            ].map((service, index) => (
                                <Card key={index} hoverable className="h-full border-[#262626] bg-[#141414]">
                                    <CardContent className="p-8">
                                        <div className="w-14 h-14 bg-[#1A1A1A] rounded-xl flex items-center justify-center mb-6 border border-[#262626] group-hover:border-[#7C3AED]/50 transition-colors">
                                            {service.icon}
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-[#7C3AED] transition-colors">{service.title}</h3>
                                        <p className="text-[#999999] leading-relaxed">{service.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Process Section */}
                <section className="py-20 px-6 md:px-12 lg:px-20 bg-[#141414]">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <span className="text-[#7C3AED] font-semibold tracking-wider uppercase text-sm mb-2 block">服務流程</span>
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">簡單四步，開啟輕鬆收租生活</h2>
                                <p className="text-[#999999] mb-8">我們簡化了繁瑣的委託流程，讓您可以最快速度享受到專業的物業管理服務。</p>

                                <div className="space-y-8">
                                    {[
                                        { step: '01', title: '諮詢與評估', desc: '線上或電話諮詢，安排專人實地評估您的物業狀況。' },
                                        { step: '02', title: '簽署委託', desc: '確認合作方案，簽署合法的委託管理合約。' },
                                        { step: '03', title: '優化與招租', desc: '進行必要的房屋整理與拍照，上架各大平台進行招租。' },
                                        { step: '04', title: '安心收租', desc: '房客入住，您只需透過 App 查看報表與接收租金。' }
                                    ].map((item, index) => (
                                        <div key={index} className="flex gap-6">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#7C3AED] text-[#7C3AED] flex items-center justify-center font-bold font-mono">
                                                {item.step}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                                <p className="text-[#999999]">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-square rounded-2xl overflow-hidden border border-[#262626] relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/20 to-transparent"></div>
                                    {/* Abstract UI representation */}
                                    <div className="absolute inset-4 bg-[#1A1A1A] rounded-xl border border-[#333333] p-6 flex flex-col gap-4">
                                        <div className="h-8 bg-[#262626] rounded w-1/3"></div>
                                        <div className="h-32 bg-[#262626] rounded w-full"></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="h-24 bg-[#262626] rounded"></div>
                                            <div className="h-24 bg-[#262626] rounded"></div>
                                        </div>
                                        <div className="mt-auto h-12 bg-[#7C3AED] rounded w-full opacity-20"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-6 md:px-12 lg:px-20 border-t border-[#262626] bg-gradient-to-r from-[#141414] to-[#1A1A1A]">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">還有其他問題嗎？</h2>
                        <p className="text-[#999999] mb-8 max-w-2xl mx-auto">
                            無論您是擁有一間套房還是一整棟公寓，我們都能為您提供最適合的方案。歡迎隨時聯繫我們。
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button size="lg">聯絡我們</Button>
                            <Button variant="outline" size="lg">查看常見問題</Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
