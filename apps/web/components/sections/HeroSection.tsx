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

                        {/* Main Building Image */}
                        <div className={styles.buildingImage}>
                            <img 
                                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" 
                                alt="Modern Property Building" 
                                className={styles.heroImg}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '12px',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HeroSection;
