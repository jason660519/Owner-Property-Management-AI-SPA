'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main>
                {/* Hero Section */}
                <section className="pt-32 pb-16 px-6 md:px-12 lg:px-20 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="z-10">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                                我們的使命是<br />
                                <span className="text-[#7C3AED]">重新定義物業管理體驗</span>
                            </h1>
                            <p className="text-[#999999] text-lg mb-8 leading-relaxed">
                                Estatein 致力於透過 AI 技術，為房東和租戶創造更透明、高效和愉快的租賃生態系統。我們相信，好的物業管理不僅僅是維護建築，更是連結人與生活的橋樑。
                            </p>

                            <div className="grid grid-cols-3 gap-6 border-t border-[#262626] pt-8">
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">200+</h3>
                                    <p className="text-[#999999] text-sm">滿意客戶</p>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">10k+</h3>
                                    <p className="text-[#999999] text-sm">物業列表</p>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">16+</h3>
                                    <p className="text-[#999999] text-sm">服務年資</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#1A1A1A] relative shadow-2xl border border-[#262626]">
                                <img
                                    src="/images/property-1.jpg"
                                    alt="Modern Office"
                                    className="w-full h-full object-cover opacity-80"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-60"></div>
                            </div>

                            {/* Abstract decorative elements */}
                            <div className="absolute -z-10 top-10 -right-10 w-40 h-40 bg-[#7C3AED] rounded-full blur-[100px] opacity-20"></div>
                            <div className="absolute -z-10 -bottom-10 -left-10 w-40 h-40 bg-[#7C3AED] rounded-full blur-[100px] opacity-20"></div>
                        </div>
                    </div>
                </section>

                {/* Values Section */}
                <section className="py-20 px-6 md:px-12 lg:px-20 bg-[#1A1A1A]">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-1">
                                <span className="text-[#7C3AED] font-semibold tracking-wider uppercase text-sm mb-2 block">我們的價值觀</span>
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">信任、卓越、以客為尊</h2>
                                <p className="text-[#999999] mb-8">
                                    這些核心價值指引著我們每一個決策，確保我們始終提供最高標準的服務。
                                </p>
                                <Button>加入我們</Button>
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    {
                                        title: '信任優先',
                                        desc: '建立透明的關係是我們一切工作的基礎。',
                                        icon: (
                                            <svg className="w-6 h-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        )
                                    },
                                    {
                                        title: '追求卓越',
                                        desc: '我們不斷優化流程，力求在每個細節上做到完美。',
                                        icon: (
                                            <svg className="w-6 h-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        )
                                    },
                                    {
                                        title: '以客為尊',
                                        desc: '您的需求是我們的首要考量，我們致力於超越您的期望。',
                                        icon: (
                                            <svg className="w-6 h-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )
                                    },
                                    {
                                        title: '創新驅動',
                                        desc: '結合最新 AI 技術，為傳統產業注入新活力。',
                                        icon: (
                                            <svg className="w-6 h-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        )
                                    }
                                ].map((item, index) => (
                                    <div key={index} className="bg-[#141414] p-6 rounded-xl border border-[#262626] hover:border-[#7C3AED]/50 transition-colors">
                                        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4 border border-[#262626]">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                        <p className="text-[#999999] text-sm">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="py-20 px-6 md:px-12 lg:px-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <span className="text-[#7C3AED] font-semibold tracking-wider uppercase text-sm mb-2 block">我們的團隊</span>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">認識 Estatein 的專家</h2>
                            <p className="text-[#999999]">
                                我們擁有一支經驗豐富、熱情專業的團隊，隨時準備為您提供最佳的房地產服務。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    name: '張志豪',
                                    role: '創辦人 & CEO',
                                    image: '/images/team/member-1.jpg'
                                },
                                {
                                    name: '李雅婷',
                                    role: '首席運營官',
                                    image: '/images/team/member-2.jpg'
                                },
                                {
                                    name: '王建國',
                                    role: '資深物業顧問',
                                    image: '/images/team/member-3.jpg'
                                }
                            ].map((member, index) => (
                                <Card key={index} hoverable className="text-center p-0 overflow-hidden group">
                                    <div className="h-80 w-full relative overflow-hidden">
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent opacity-80 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-end justify-center pb-6">
                                            <div className="flex gap-4">
                                                <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:bg-[#7C3AED] hover:text-white transition-colors">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                                                </a>
                                                <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:bg-[#7C3AED] hover:text-white transition-colors">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="py-6">
                                        <h3 className="text-xl font-bold text-white">{member.name}</h3>
                                        <p className="text-[#999999] text-sm mt-1">{member.role}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-6 md:px-12 lg:px-20 border-t border-[#262626] bg-gradient-to-r from-[#141414] to-[#1A1A1A]">
                    <div className="max-w-5xl mx-auto relative">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-[#7C3AED] rounded-full blur-[120px] opacity-20"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-4">準備好開始您的旅程了嗎？</h2>
                                <p className="text-[#999999] max-w-xl">
                                    探索我們的精選物業，或聯繫我們團隊，讓我們為您找到理想的家。
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="primary" size="lg">瀏覽物業</Button>
                                <Button variant="secondary" size="lg">聯繫我們</Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
