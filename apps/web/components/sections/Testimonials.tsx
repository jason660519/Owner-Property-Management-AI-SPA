'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import styles from './Testimonials.module.css';

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
        id: '1',
        name: '王大明',
        role: '房東',
        avatar: 'https://i.pravatar.cc/150?u=1',
        rating: 5,
        content: '使用 Estatein 後，我的物業管理變得輕鬆許多。AI 助手能幫我處理大部分的租戶問題，讓我有更多時間專注在其他事情上。',
    },
    {
        id: '2',
        name: '李小華',
        role: '投資人',
        avatar: 'https://i.pravatar.cc/150?u=2',
        rating: 5,
        content: '這個平台的數據分析功能非常強大，幫助我做出更明智的投資決策。租金優化建議讓我的收益提升了 20%！',
    },
    {
        id: '3',
        name: '張美玲',
        role: '物業經理',
        avatar: 'https://i.pravatar.cc/150?u=3',
        rating: 5,
        content: '作為物業經理，我需要同時管理多個物業。Estatein 的統一管理介面讓我大大提升了工作效率，客戶也更滿意了。',
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
                    fill={i < rating ? 'var(--color-star)' : 'none'}
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

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Section Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <span className={styles.sparkle}>✨</span>
                        <h2 className={styles.title}>看看我們的客戶都說什麼</h2>
                        <p className={styles.description}>
                            我們的客戶遍布全台各地，聽聽他們使用 Estatein 的真實體驗。
                        </p>
                    </div>
                    <div className={styles.viewAll}>
                        <Button variant="secondary">
                            查看全部評價
                        </Button>
                    </div>
                </div>

                {/* Testimonials Grid */}
                <div className={styles.grid}>
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.id} className={styles.card}>
                            <StarRating rating={testimonial.rating} />
                            <h3 className={styles.cardTitle}>優質服務體驗</h3>
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
                    <span className={styles.paginationText}>01 of 10</span>
                    <div className={styles.paginationButtons}>
                        <Button variant="icon" size="md" onClick={handlePrev} aria-label="上一頁">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Button>
                        <Button variant="icon" size="md" onClick={handleNext} aria-label="下一頁">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Testimonials;
