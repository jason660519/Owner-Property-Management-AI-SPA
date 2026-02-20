'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/Card';

const pricingPlans = [
    {
        id: 'free',
        title: '免費 － 房屋廣告免費',
        description: '刊登物件零成本，適合先試水溫的房東',
        price: 'NT$0',
        period: '/ 月',
        features: [
            '房屋廣告刊登（免費）',
            '社群支援'
        ],
        cta: '立即開始',
        variant: 'outline' as const
    },
    {
        id: 'tenant-contract',
        title: '房客管理 + 合約管理',
        description: '1 組完整管理，適合有出租需求的房東',
        price: 'NT$99',
        period: '/ 月',
        features: [
            '房屋廣告刊登（免費）',
            '房客管理',
            '合約管理',
            '自動催繳',
            '房客篩選',
            'AI 合約輔助'
        ],
        cta: '選擇此方案',
        variant: 'primary' as const,
        popular: true
    }
];

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main>
                {/* Hero Section */}
                <section className="pt-32 pb-20 px-6 md:px-12 lg:px-20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED] rounded-full blur-[150px] opacity-20 -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7C3AED] rounded-full blur-[120px] opacity-10 -z-10"></div>
                    
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            簡單透明的<span className="text-[#7C3AED]">定價方案</span>
                        </h1>
                        <p className="text-[#999999] text-lg max-w-2xl mx-auto mb-4">
                            房屋廣告一律免費，付費方案為 1 組「房客管理 + 合約管理」。
                        </p>
                        <p className="text-[#999999] text-base max-w-2xl mx-auto mb-8">
                            無隱藏費用，隨時可取消。
                        </p>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="pb-20 px-6 md:px-12 lg:px-20">
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                        {pricingPlans.map((plan) => (
                            <div key={plan.id} className="relative group">
                                <Card 
                                    className={`h-full flex flex-col border-[#262626] bg-[#1A1A1A] relative overflow-hidden transition-all duration-300 ${plan.popular ? 'border-[#7C3AED] shadow-[0_0_24px_rgba(124,58,237,0.12)]' : 'hover:border-[#7C3AED]/50'}`}
                                >
                                    <CardHeader className="text-center pb-2 pt-6">
                                        {plan.popular && (
                                            <div className="flex justify-center mb-2">
                                                <span className="bg-[#7C3AED] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                    最受歡迎
                                                </span>
                                            </div>
                                        )}
                                        <CardTitle className="text-2xl font-bold">{plan.title}</CardTitle>
                                        <CardDescription className="text-[#999999] mt-2">{plan.description}</CardDescription>
                                    </CardHeader>
                                    
                                    <CardContent className="flex-grow flex flex-col items-center pt-6">
                                        <div className="flex items-baseline mb-8">
                                            <span className="text-4xl md:text-5xl font-bold">{plan.price}</span>
                                            <span className="text-[#999999] ml-2">{plan.period}</span>
                                        </div>
                                        
                                        <ul className="w-full space-y-4 mb-8">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center text-sm text-[#CCCCCC]">
                                                    <svg className="w-5 h-5 text-[#7C3AED] mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    
                                    <CardFooter>
                                        <Button 
                                            variant={plan.variant === 'primary' ? 'primary' : 'secondary'} 
                                            className="w-full"
                                            size="lg"
                                        >
                                            {plan.cta}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQ Section Preview */}
                <section className="py-20 px-6 md:px-12 lg:px-20 border-t border-[#262626] bg-[#141414]">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-6">常見問題</h2>
                        <div className="space-y-6 text-left max-w-2xl mx-auto">
                            <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#262626]">
                                <h3 className="text-lg font-bold mb-2">我可以隨時更換方案嗎？</h3>
                                <p className="text-[#999999]">是的，您可以隨時升級或降級您的方案。升級方案將立即生效，費用將依比例計算。</p>
                            </div>
                            <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#262626]">
                                <h3 className="text-lg font-bold mb-2">是否有提供退款保證？</h3>
                                <p className="text-[#999999]">我們提供 14 天滿意保證。如果您在前 14 天內對服務不滿意，我們可以全額退款。</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
