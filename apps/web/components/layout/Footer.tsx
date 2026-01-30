'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import styles from './Footer.module.css';

const footerLinks = {
    home: [
        { href: '/', label: '首頁' },
        { href: '/about', label: '關於我們' },
        { href: '/properties', label: '物業列表' },
        { href: '/services', label: '服務項目' },
        { href: '/contact', label: '聯絡我們' },
    ],
    properties: [
        { href: '/properties?type=house', label: '獨棟住宅' },
        { href: '/properties?type=apartment', label: '公寓套房' },
        { href: '/properties?type=commercial', label: '商業物業' },
        { href: '/properties?type=land', label: '土地' },
    ],
    services: [
        { href: '/services#property-management', label: '物業管理' },
        { href: '/services#ai-assistant', label: 'AI 智能助手' },
        { href: '/services#tenant-screening', label: '租戶篩選' },
        { href: '/services#maintenance', label: '維修管理' },
    ],
    contact: [
        { href: '/contact', label: '聯絡表單' },
        { href: '/faq', label: '常見問題' },
        { href: '/support', label: '客戶支援' },
    ],
};

const socialLinks = [
    {
        name: 'Facebook',
        href: 'https://facebook.com',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 2H15C13.6739 2 12.4021 2.52678 11.4645 3.46447C10.5268 4.40215 10 5.67392 10 7V10H7V14H10V22H14V14H17L18 10H14V7C14 6.73478 14.1054 6.48043 14.2929 6.29289C14.4804 6.10536 14.7348 6 15 6H18V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        name: 'Twitter',
        href: 'https://twitter.com',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 3.00005C22.0424 3.67552 20.9821 4.19216 19.86 4.53005C19.2577 3.83756 18.4573 3.34674 17.567 3.12397C16.6767 2.90121 15.7395 2.95724 14.8821 3.2845C14.0247 3.61176 13.2884 4.19445 12.773 4.95376C12.2575 5.71308 11.9877 6.61238 12 7.53005V8.53005C10.2426 8.57561 8.50127 8.18586 6.93101 7.39549C5.36074 6.60513 4.01032 5.43868 3 4.00005C3 4.00005 -1 13 8 17C5.94053 18.398 3.48716 19.099 1 19C10 24 21 19 21 7.50005C20.9991 7.2215 20.9723 6.94364 20.92 6.67005C21.9406 5.66354 22.6608 4.39276 23 3.00005Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        name: 'Instagram',
        href: 'https://instagram.com',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
            </svg>
        ),
    },
    {
        name: 'LinkedIn',
        href: 'https://linkedin.com',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2" y="9" width="4" height="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        name: 'YouTube',
        href: 'https://youtube.com',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.5396 6.42C22.4208 5.94541 22.1789 5.51057 21.8382 5.15941C21.4976 4.80824 21.0703 4.55318 20.5996 4.42C18.8796 4 11.9996 4 11.9996 4C11.9996 4 5.11959 4 3.39959 4.46C2.92884 4.59318 2.50157 4.84824 2.16094 5.19941C1.82031 5.55057 1.57838 5.98541 1.45959 6.46C1.14521 8.20556 0.991228 9.97631 0.999592 11.75C0.988374 13.537 1.14236 15.3213 1.45959 17.08C1.59055 17.5398 1.8379 17.9581 2.17774 18.2945C2.51758 18.6308 2.93842 18.8738 3.39959 19C5.11959 19.46 11.9996 19.46 11.9996 19.46C11.9996 19.46 18.8796 19.46 20.5996 19C21.0703 18.8668 21.4976 18.6118 21.8382 18.2606C22.1789 17.9094 22.4208 17.4746 22.5396 17C22.8517 15.2676 23.0057 13.5103 22.9996 11.75C23.0108 9.96295 22.8568 8.1787 22.5396 6.42Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.75 15.02L15.5 11.75L9.75 8.48V15.02Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
];

export function Footer() {
    return (
        <footer className={styles.footer}>
            {/* CTA Section */}
            <div className={styles.cta}>
                <div className={styles.ctaPattern}></div>
                <div className={styles.ctaContent}>
                    <h2 className={styles.ctaTitle}>今日起，開啟您的房地產之旅</h2>
                    <p className={styles.ctaDescription}>
                        讓我們的 AI 智能助手幫助您輕鬆管理物業，提升租金收益，節省寶貴時間。
                    </p>
                    <Button variant="primary" size="lg">
                        免費開始使用
                    </Button>
                </div>
            </div>

            {/* Main Footer */}
            <div className={styles.main}>
                <div className={styles.container}>
                    {/* Brand Section */}
                    <div className={styles.brand}>
                        <Link href="/" className={styles.logo}>
                            <div className={styles.logoIcon}>
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="28" height="28" rx="6" fill="var(--color-accent)" />
                                    <path d="M7 14L14 8L21 14V21C21 21.5523 20.5523 22 20 22H8C7.44772 22 7 21.5523 7 21V14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M11 22V15H17V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className={styles.logoText}>Estatein</span>
                        </Link>

                        {/* Newsletter */}
                        <div className={styles.newsletter}>
                            <p className={styles.newsletterText}>訂閱我們的電子報</p>
                            <form className={styles.newsletterForm}>
                                <input
                                    type="email"
                                    placeholder="輸入您的電子郵件"
                                    className={styles.newsletterInput}
                                />
                                <Button variant="primary" type="submit">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Links Grid */}
                    <div className={styles.linksGrid}>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkGroupTitle}>網站導覽</h4>
                            <ul className={styles.linkList}>
                                {footerLinks.home.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.link}>
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkGroupTitle}>物業類型</h4>
                            <ul className={styles.linkList}>
                                {footerLinks.properties.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.link}>
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkGroupTitle}>服務項目</h4>
                            <ul className={styles.linkList}>
                                {footerLinks.services.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.link}>
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkGroupTitle}>聯絡方式</h4>
                            <ul className={styles.linkList}>
                                {footerLinks.contact.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.link}>
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className={styles.bottom}>
                <div className={styles.bottomContent}>
                    <p className={styles.copyright}>
                        © {new Date().getFullYear()} Estatein. 保留所有權利。
                    </p>

                    <div className={styles.legal}>
                        <Link href="/terms" className={styles.legalLink}>
                            服務條款
                        </Link>
                        <Link href="/privacy" className={styles.legalLink}>
                            隱私政策
                        </Link>
                    </div>

                    <div className={styles.social}>
                        {socialLinks.map((social) => (
                            <a
                                key={social.name}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label={social.name}
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
