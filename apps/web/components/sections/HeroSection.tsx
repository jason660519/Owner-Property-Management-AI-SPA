'use client';

import React from 'react';
import { Button } from '../ui/Button';
import styles from './HeroSection.module.css';

const stats = [
    { value: '200+', label: '滿意客戶' },
    { value: '100k+', label: '物業總價值' },
    { value: '10+', label: '年服務經驗' },
];

export function HeroSection() {
    return (
        <section className={styles.hero}>
            <div className={styles.container}>
                {/* Left Content */}
                <div className={styles.content}>
                    <h1 className={styles.title}>
                        房東物業的 AI 好幫手
                    </h1>
                    <p className={styles.description}>
                        透過我們的 AI 智能平台，輕鬆管理您的不動產資產。
                        無論是租賃管理、物業維護還是收益優化，我們都能為您提供全方位的解決方案。
                    </p>

                    {/* CTA Buttons */}
                    <div className={styles.cta}>
                        <Button variant="primary" size="lg">
                            了解更多
                        </Button>
                        <Button variant="secondary" size="lg">
                            瀏覽物業
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className={styles.stats}>
                        {stats.map((stat, index) => (
                            <div key={index} className={styles.statItem}>
                                <span className={styles.statValue}>{stat.value}</span>
                                <span className={styles.statLabel}>{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Image */}
                <div className={styles.imageWrapper}>
                    <div className={styles.imageContainer}>
                        {/* Abstract Design Background */}
                        <div className={styles.abstractBg}></div>

                        {/* Main Building Image - Using placeholder for now */}
                        <div className={styles.buildingImage}>
                            <svg viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.buildingSvg}>
                                {/* Modern Building Illustration */}
                                <defs>
                                    <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#1e40af" />
                                    </linearGradient>
                                    <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                                    </linearGradient>
                                </defs>

                                {/* Main Tower */}
                                <rect x="100" y="50" width="200" height="500" rx="4" fill="url(#buildingGradient)" />

                                {/* Windows Grid */}
                                {[...Array(12)].map((_, row) => (
                                    [...Array(4)].map((_, col) => (
                                        <rect
                                            key={`${row}-${col}`}
                                            x={120 + col * 45}
                                            y={70 + row * 40}
                                            width="35"
                                            height="30"
                                            rx="2"
                                            fill="url(#glassGradient)"
                                        />
                                    ))
                                ))}

                                {/* Side Building Left */}
                                <rect x="50" y="200" width="70" height="350" rx="4" fill="#2563eb" />
                                {[...Array(8)].map((_, row) => (
                                    <rect
                                        key={`left-${row}`}
                                        x={60}
                                        y={220 + row * 40}
                                        width="50"
                                        height="28"
                                        rx="2"
                                        fill="url(#glassGradient)"
                                    />
                                ))}

                                {/* Side Building Right */}
                                <rect x="280" y="150" width="80" height="400" rx="4" fill="#1d4ed8" />
                                {[...Array(9)].map((_, row) => (
                                    <rect
                                        key={`right-${row}`}
                                        x={290}
                                        y={170 + row * 42}
                                        width="60"
                                        height="30"
                                        rx="2"
                                        fill="url(#glassGradient)"
                                    />
                                ))}
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HeroSection;
