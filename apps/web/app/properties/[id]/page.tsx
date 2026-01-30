'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <div className="min-h-screen bg-[#141414] text-white font-urbanist">
            <Header />

            <main className="pt-32 pb-20 px-6 md:px-12 lg:px-20">
                <div className="max-w-4xl mx-auto">
                    <Link href="/properties" className="inline-flex items-center text-[#999999] hover:text-[#7C3AED] mb-8 transition-colors">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        返回物業列表
                    </Link>

                    <div className="bg-[#1A1A1A] p-12 rounded-2xl border border-[#262626] text-center">
                        <div className="w-20 h-20 bg-[#262626] rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h1 className="text-4xl font-bold mb-4">物業詳情頁面</h1>
                        <p className="text-[#999999] text-xl mb-8">
                            您正在查看物業 ID: <span className="text-white font-mono bg-[#262626] px-2 py-1 rounded">{id}</span>
                        </p>
                        <p className="text-[#666666] mb-8">
                            此頁面正在建設中，將很快包含完整的物業圖片庫、詳細資訊、地圖和預約表格。
                        </p>

                        <div className="flex justify-center gap-4">
                            <Button>聯繫房仲</Button>
                            <Button variant="secondary">預約看房</Button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
