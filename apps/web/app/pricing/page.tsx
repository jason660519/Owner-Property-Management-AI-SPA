'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/Card';

const pricingPlans = [
    {
        id: 'free',
        title: '免費版',
        description: '適合剛起步的房東體驗',
        price: '$0',
        period: '/ 月',
        features: [
            '管理 1 個物業',
            '基礎租客管理',
            '每月財務報表',
            '社群支援'
        ],
        cta: '立即開始',
        variant: 'outline' as const
    },
    {
        id: '1-year',
        title: '1 年會員',
        description: '適合專業房東的完整方案',
        price: '$999',
        period: '/ 月',
        features: [
            '管理無限物業',
            'AI 智能分析與建議',
            '進階財務報表與稅務輔助',
            '優先客戶支援',
            '自動化租金催收'
        ],
        cta: '選擇此方案',
        variant: 'primary' as const,
        popular: true
    },
    {
        id: '3-year',
        title: '3 年會員',
        description: '長期投資的最佳選擇',
        price: '$799',
        period: '/ 月',
        features: [
            '包含所有 1 年會員功能',
            '專屬帳戶經理',
            '法律諮詢服務',
            '優先體驗新功能',
            '享有 20% 折扣優惠'
        ],
        cta: '最佳優惠',
        variant: 'secondary' as const
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
                        <p className="text-[#999999] text-lg max-w-2xl mx-auto mb-8">
                            無論您是剛開始管理第一個物業，還是擁有龐大的資產組合，我們都有適合您的方案。
                            無隱藏費用，隨時可取消。
                        </p>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="pb-20 px-6 md:px-12 lg:px-20">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {pricingPlans.map((plan) => (
                            <div key={plan.id} className="relative group">
                                {plan.popular && (
                                    <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                                        <span className="bg-[#7C3AED] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                            最受歡迎
                                        </span>
                                    </div>
                                )}
                                <Card 
                                    className={`h-full flex flex-col border-[#262626] bg-[#1A1A1A] relative overflow-hidden transition-all duration-300 ${plan.popular ? 'border-[#7C3AED] shadow-[0_0_30px_rgba(124,58,237,0.15)] scale-105 z-10' : 'hover:border-[#7C3AED]/50'}`}
                                >
                                    <CardHeader className="text-center pb-2">
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
