'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Props {
    isLoggedIn: boolean;
}

/**
 * Right-column contact card on the property detail page.
 * Renders different UI for guests vs authenticated users.
 */
export function PropertyContactCard({ isLoggedIn }: Props) {
    if (!isLoggedIn) {
        return (
            <div className="bg-[#1A1A1A] p-8 rounded-xl border border-[#262626] sticky top-32">
                <h3 className="text-xl font-bold mb-3">對此物業有興趣？</h3>
                <p className="text-[#999999] mb-6">
                    登入或免費註冊後，即可預約看房、收藏物件，並取得更多專屬資訊。
                </p>

                <div className="space-y-3">
                    <Link href="/login?redirectTo=/properties" className="block">
                        <Button variant="primary" fullWidth size="lg">
                            登入以預約看房
                        </Button>
                    </Link>
                    <Link href="/register" className="block">
                        <Button variant="secondary" fullWidth size="lg">
                            免費成為會員
                        </Button>
                    </Link>
                </div>

                <div className="mt-8 pt-8 border-t border-[#262626] text-center">
                    <p className="text-[#999999] mb-2">或直接致電服務專線</p>
                    <p className="text-xl font-bold text-white">+61 405 142 777</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1A1A1A] p-8 rounded-xl border border-[#262626] sticky top-32">
            <h3 className="text-xl font-bold mb-6">對此物業有興趣？</h3>
            <p className="text-[#999999] mb-8">
                填寫下方表格，我們將盡快安排專人為您介紹與安排看房。
            </p>

            <form className="space-y-4">
                <input
                    type="text"
                    placeholder="您的稱呼"
                    className="w-full bg-[#141414] border border-[#333333] rounded-lg px-4 py-3 focus:outline-none focus:border-[#7C3AED]"
                />
                <input
                    type="email"
                    placeholder="電子信箱"
                    className="w-full bg-[#141414] border border-[#333333] rounded-lg px-4 py-3 focus:outline-none focus:border-[#7C3AED]"
                />
                <input
                    type="tel"
                    placeholder="聯絡電話"
                    className="w-full bg-[#141414] border border-[#333333] rounded-lg px-4 py-3 focus:outline-none focus:border-[#7C3AED]"
                />
                <textarea
                    rows={3}
                    placeholder="我想詢問關於..."
                    className="w-full bg-[#141414] border border-[#333333] rounded-lg px-4 py-3 focus:outline-none focus:border-[#7C3AED]"
                />
                <Button variant="primary" fullWidth size="lg">
                    發送詢問
                </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-[#262626] text-center">
                <p className="text-[#999999] mb-2">或直接致電服務專線</p>
                <p className="text-xl font-bold text-white">+61 405 142 777</p>
            </div>
        </div>
    );
}
