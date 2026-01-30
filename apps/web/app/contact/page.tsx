'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main>
                {/* Hero Section */}
                <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            src="/images/contact-hero.jpg"
                            alt="Contact Hero"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">聯絡我們</h1>
                        <p className="text-[#999999] text-lg max-w-2xl mx-auto">
                            我們隨時樂意為您解答任何疑問。請填寫下方表單，或透過其他方式與我們聯繫。
                        </p>
                    </div>
                </section>

                {/* Contact Content */}
                <section className="py-20 px-6 md:px-12 lg:px-20 bg-[#1A1A1A]">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

                        {/* Contact Information */}
                        <div>
                            <span className="text-[#7C3AED] font-semibold tracking-wider uppercase text-sm mb-2 block">保持聯繫</span>
                            <h2 className="text-3xl md:text-4xl font-bold mb-8">讓我們開始對話</h2>
                            <p className="text-[#999999] mb-12 leading-relaxed">
                                無論您是對我們的物業管理服務感興趣，還是有關於現有物業的問題，我們的團隊都隨時準備提供協助。
                            </p>

                            <div className="space-y-8">
                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center flex-shrink-0 text-[#7C3AED]">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Email</h3>
                                        <p className="text-[#999999]">hello@estatein.com</p>
                                        <p className="text-[#999999]">support@estatein.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center flex-shrink-0 text-[#7C3AED]">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">電話</h3>
                                        <p className="text-[#999999]">+886 2 2345 6789</p>
                                        <p className="text-[#999999]">+886 912 345 678</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center flex-shrink-0 text-[#7C3AED]">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">辦公室</h3>
                                        <p className="text-[#999999]">台北市信義區信義路五段 7 號</p>
                                        <p className="text-[#999999]">台北 101 大樓 35 樓</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center flex-shrink-0 text-[#7C3AED]">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">營業時間</h3>
                                        <p className="text-[#999999]">週一至週五: 09:00 - 18:00</p>
                                        <p className="text-[#999999]">週末與國定假日休息</p>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="mt-12 flex gap-4">
                                {['Facebook', 'Line', 'Instagram', 'LinkedIn'].map((social) => (
                                    <Button key={social} variant="icon" size="md" className="rounded-full bg-[#262626] hover:bg-[#7C3AED] border-none text-white">
                                        <span className="sr-only">{social}</span>
                                        {/* Social Icon Placeholders */}
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.909c3.916 0 7.091 3.175 7.091 7.091 0 3.916-3.175 7.091-7.091 7.091-3.916 0-7.091-3.175-7.091-7.091 0-3.916 3.175-7.091 7.091-7.091z" /></svg>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div>
                            <Card className="bg-[#141414] border-[#262626] p-8">
                                <form className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white">姓名</label>
                                            <Input placeholder="請輸入您的姓名" className="bg-[#1A1A1A] border-[#333333]" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white">Email</label>
                                            <Input type="email" placeholder="請輸入您的 Email" className="bg-[#1A1A1A] border-[#333333]" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white">電話</label>
                                            <Input placeholder="請輸入聯絡電話" className="bg-[#1A1A1A] border-[#333333]" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white">詢問類型</label>
                                            <select className="w-full h-10 px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]">
                                                <option>一般諮詢</option>
                                                <option>物業代管</option>
                                                <option>租屋需求</option>
                                                <option>維修報修</option>
                                                <option>其他</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white">訊息內容</label>
                                        <textarea
                                            rows={6}
                                            placeholder="請詳述您的需求或問題..."
                                            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                                        ></textarea>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <input type="checkbox" id="scrapi" className="rounded bg-[#1A1A1A] border-[#333333] text-[#7C3AED] focus:ring-[#7C3AED]" />
                                        <label htmlFor="scrapi" className="text-sm text-[#999999]">我同意 Estatein 處理我的個人資料以回應此詢問。</label>
                                    </div>

                                    <Button type="submit" fullWidth size="lg">發送訊息</Button>
                                </form>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Map Section */}
                <section className="h-[400px] w-full bg-[#262626] relative flex items-center justify-center">
                    <div className="absolute inset-0 opacity-50">
                        {/* This would be an iframe for Google Maps in production */}
                        <div className="w-full h-full bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/USA_location_map.svg')] bg-cover bg-center grayscale opacity-20"></div>
                    </div>
                    <div className="relative z-10 bg-[#141414] p-8 rounded-xl border border-[#333333] shadow-2xl max-w-sm">
                        <h3 className="text-xl font-bold mb-2">來訪我們</h3>
                        <p className="text-[#999999] mb-4">台北市信義區信義路五段 7 號<br />台北 101 大樓 35 樓</p>
                        <Button variant="outline" size="sm" fullWidth>在 Google 地圖上查看</Button>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
