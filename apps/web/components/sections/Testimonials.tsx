"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Button } from "../ui/Button";
import styles from "./Testimonials.module.css";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  content: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "陳怡安",
    role: "自售房東",
    avatar: "https://i.pravatar.cc/150?u=1",
    rating: 5,
    content:
      "我一開始只是想自己賣房，結果平台把詢問、看屋安排、文件清單都收在一起。等案件變複雜時，再把仲介與代書拉進來，不用重建流程。",
  },
  {
    id: "2",
    name: "林冠廷",
    role: "仲介店長",
    avatar: "https://i.pravatar.cc/150?u=2",
    rating: 5,
    content:
      "以前分店的案件、名單、帶看進度都散在不同工具。現在我可以直接看到誰卡在補件、誰快成交，主管會議也不用再手動追表。",
  },
  {
    id: "3",
    name: "周品妤",
    role: "代書協作顧問",
    avatar: "https://i.pravatar.cc/150?u=3",
    rating: 5,
    content:
      "我最在意的是補件與簽約節點要清楚。Owner AI 讓我直接看到案件上下游的人在做什麼，減少來回確認，也比較容易準時完成交屋。",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={i < rating ? "var(--color-star)" : "none"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="var(--color-star)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const orderedTestimonials = [
    ...testimonials.slice(currentIndex),
    ...testimonials.slice(0, currentIndex),
  ];

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.sparkle}>✨</span>
            <h2 className={styles.title}>不同角色，正在用同一個平台推進案件</h2>
            <p className={styles.description}>
              從自售房東到仲介店長，再到代書協作角色，平台的價值不是單點工具，而是讓案件在多人之間順暢往前走。
            </p>
          </div>
          <div className={styles.viewAll}>
            <Link href="/pricing">
              <Button variant="secondary">查看角色方案</Button>
            </Link>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className={styles.grid}>
          {orderedTestimonials.map((testimonial) => (
            <div key={testimonial.id} className={styles.card}>
              <StarRating rating={testimonial.rating} />
              <h3 className={styles.cardTitle}>{testimonial.role}</h3>
              <p className={styles.cardContent}>{testimonial.content}</p>
              <div className={styles.author}>
                <div className={styles.avatarPlaceholder}>
                  {testimonial.name.charAt(0)}
                </div>
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>{testimonial.name}</span>
                  <span className={styles.authorRole}>{testimonial.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <span className={styles.paginationText}>
            {String(currentIndex + 1).padStart(2, "0")} of{" "}
            {String(testimonials.length).padStart(2, "0")}
          </span>
          <div className={styles.paginationButtons}>
            <Button
              variant="icon"
              size="md"
              onClick={handlePrev}
              aria-label="上一頁"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <Button
              variant="icon"
              size="md"
              onClick={handleNext}
              aria-label="下一頁"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
