"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Button } from "../ui/Button";
import styles from "./FAQ.module.css";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: "1",
    question: "哪些角色現在可以免費使用？",
    answer:
      "目前自售房東、自租房東、租客與買家都可以免費建立帳號，先把案件與需求帶進平台。專業角色如仲介、店長、代書、律師與企業合作方則採按案件或方案收費。",
  },
  {
    id: "2",
    question: "仲介與分店要怎麼開始導入？",
    answer:
      "建議先從單一仲介或單一分店開始，讓案件、名單、帶看進度與文件清單先進入同一個工作流。驗證流程後，再擴張到更多席次與團隊報表。",
  },
  {
    id: "3",
    question: "服務有哪些收費方案？",
    answer:
      "平台目前分為免費流量入口、仲介個人版、分店管理版與企業合作版，並額外提供代書、律師、裝修等按案件計價角色。pricing 頁面已提供 TWD 與 AUD 檢視。",
  },
  {
    id: "4",
    question: "AI 助手在多角色流程裡能做什麼？",
    answer:
      "AI 助手可協助整理詢問、提醒待辦、標記補件、生成溝通摘要、追蹤帶看與簽約節點，重點不是取代專業角色，而是讓跨角色交接更少遺漏。",
  },
  {
    id: "5",
    question: "我的資料安全嗎？",
    answer:
      "絕對安全。我們使用銀行級加密技術保護您的所有資料，並符合 GDPR 和個人資料保護法規範。所有資料都儲存在安全的雲端伺服器，並定期進行備份。",
  },
  {
    id: "6",
    question: "如果我要談合作提案或導入諮詢怎麼辦？",
    answer:
      "您可以直接從 pricing、services 或 footer 的 CTA 進入聯絡頁，系統會自動帶入「合作提案」詢問類型，方便我們依角色與合作模式回覆。",
  },
];

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`${styles.item} ${isOpen ? styles.open : ""}`}>
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
              <path
                d="M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <>
                <path
                  d="M12 5V19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
  const [openId, setOpenId] = useState<string | null>("1");

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
            <h2 className={styles.title}>常見問題與導入說明</h2>
            <p className={styles.description}>
              先回答免費角色、付費角色、導入順序與合作方式，讓你快速判斷該從哪一個角色開始切入平台。
            </p>
          </div>
          <div className={styles.viewAll}>
            <Link href="/pricing">
              <Button variant="secondary">查看完整方案</Button>
            </Link>
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
