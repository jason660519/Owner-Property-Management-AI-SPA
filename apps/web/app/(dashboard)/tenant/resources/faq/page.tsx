'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: "如何預約看房？",
    answer: "您可以在「房東物件」頁面中，點擊感興趣的物件，然後點擊「預約看房」按鈕。選擇您方便的時間後提交申請，待房東確認後即可。",
  },
  {
    question: "如何提交租賃要約書？",
    answer: "在您參觀過物件並決定承租後，可以通過該物件的詳情頁面點擊「提交要約」或「申請租賃」。填寫必要的個人資訊、預計起租日及出價金額後提交。",
  },
  {
    question: "租金包含哪些費用？",
    answer: "租金通常僅包含房屋使用費。管理費、水電費、網路費等通常需要另外計算，具體請參閱個別物件的詳細說明或租約條款。",
  },
  {
    question: "簽約時需要準備什麼文件？",
    answer: "通常需要身分證正本（供查驗）、影本（供留存）、印章，以及押金和第一個月租金。若有連帶保證人，保證人也需提供相應證件。",
  },
  {
    question: "押金是多少？",
    answer: "根據台灣法律規定，住宅租賃押金最高不得超過兩個月租金。",
  },
  {
    question: "如何支付租金？",
    answer: "我們提供多種支付方式，包括銀行轉帳、信用卡支付或超商繳款。您可以在「租金繳納」頁面查看您的付款選項。",
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[#333333] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 text-left text-white hover:text-[#7C3AED] transition-colors focus:outline-none"
      >
        <span className="font-medium">{question}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-40 opacity-100 pb-4" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-[#CCCCCC] text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">常見問題</h1>
        <p className="text-[#999999]">解答您關於租房流程的疑問</p>
      </div>

      <Card className="bg-[#262626] border-[#333333]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#7C3AED]" />
            <CardTitle className="text-white">租賃相關問答</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            {faqs.map((faq, index) => (
              <FAQItem key={index} {...faq} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
