'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import styles from './FAQ.module.css';

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

const faqItems: FAQItem[] = [
    {
        id: '1',
        question: '我要如何與 AI 聯絡？',
        answer: '您可以透過我們的智能對話系統與 AI 助手互動。登入後，在儀表板右下角會出現 AI 助手按鈕，點擊即可開始對話。AI 助手 24/7 全天候服務，可以回答您關於物業管理的各種問題。',
    },
    {
        id: '2',
        question: '如何開始使用物業管理服務？',
        answer: '首先，請完成免費註冊並驗證您的電子郵件。接著，您可以新增您的物業資訊，包括地址、房型、租金等基本資料。完成後，我們的 AI 系統就會開始為您提供智能化的管理建議。',
    },
    {
        id: '3',
        question: '服務有哪些收費方案？',
        answer: '我們提供三種方案：基礎版（免費）、專業版（每月 $999）和企業版（自訂價格）。基礎版包含基本物業管理功能，專業版增加 AI 分析和自動化功能，企業版則提供完整的客製化解決方案。',
    },
    {
        id: '4',
        question: 'AI 助手能幫我做什麼？',
        answer: 'AI 助手可以幫您處理租戶溝通、自動回覆常見問題、生成租賃合約、分析租金市場行情、安排維修工作、追蹤租金收款等。它就像是您的 24/7 虛擬物業經理。',
    },
    {
        id: '5',
        question: '我的資料安全嗎？',
        answer: '絕對安全。我們使用銀行級加密技術保護您的所有資料，並符合 GDPR 和個人資料保護法規範。所有資料都儲存在安全的雲端伺服器，並定期進行備份。',
    },
    {
        id: '6',
        question: '如何聯繫客服支援？',
        answer: '您可以透過多種方式聯繫我們：AI 即時對話、電子郵件 (support@estatein.com)、電話 (02-1234-5678) 或填寫網站上的聯絡表單。我們的客服團隊會在 24 小時內回覆您的問題。',
    },
];

function FAQAccordionItem({
    item,
    isOpen,
    onToggle
}: {
    item: FAQItem;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={`${styles.item} ${isOpen ? styles.open : ''}`}>
            <button
                className={styles.itemHeader}
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <h3 className={styles.question}>{item.question}</h3>
                <span className={styles.icon}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {isOpen ? (
                            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                            <>
                                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                        )}
                    </svg>
                </span>
            </button>
            <div className={styles.itemContent}>
                <p className={styles.answer}>{item.answer}</p>
            </div>
        </div>
    );
}

export function FAQ() {
    const [openId, setOpenId] = useState<string | null>('1');

    const handleToggle = (id: string) => {
        setOpenId(openId === id ? null : id);
    };

    // Split FAQ items into two columns
    const leftItems = faqItems.filter((_, i) => i % 2 === 0);
    const rightItems = faqItems.filter((_, i) => i % 2 === 1);

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Section Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <span className={styles.sparkle}>✨</span>
                        <h2 className={styles.title}>常見 Q&A</h2>
                        <p className={styles.description}>
                            以下是我們最常收到的問題與解答，幫助您更快了解我們的服務。
                        </p>
                    </div>
                    <div className={styles.viewAll}>
                        <Button variant="secondary">
                            查看全部問題
                        </Button>
                    </div>
                </div>

                {/* FAQ Grid */}
                <div className={styles.grid}>
                    <div className={styles.column}>
                        {leftItems.map((item) => (
                            <FAQAccordionItem
                                key={item.id}
                                item={item}
                                isOpen={openId === item.id}
                                onToggle={() => handleToggle(item.id)}
                            />
                        ))}
                    </div>
                    <div className={styles.column}>
                        {rightItems.map((item) => (
                            <FAQAccordionItem
                                key={item.id}
                                item={item}
                                isOpen={openId === item.id}
                                onToggle={() => handleToggle(item.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default FAQ;
