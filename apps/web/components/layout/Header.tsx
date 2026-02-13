'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../theme-toggle';
import styles from './Header.module.css';

const navLinks = [
  { href: '/', label: '首頁' },
  { href: '/about', label: '關於我們' },
  { href: '/properties', label: '物業列表' },
  { href: '/services', label: '服務項目' },
  { href: '/contact', label: '聯絡我們' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  const highlightAuth = isLoginPage || isRegisterPage;
  const loginVariant = highlightAuth ? (isLoginPage ? 'primary' : 'secondary') : 'secondary';
  const registerVariant = highlightAuth ? (isRegisterPage ? 'primary' : 'secondary') : 'primary';

  const { user, loading } = useAuth();
  const supabase = createClient();

  const role = user?.user_metadata?.role || user?.user_metadata?.primary_role || 'landlord';
  const superadminBaseUrl = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';
  const dashboardMap: Record<string, string> = {
    super_admin: `${superadminBaseUrl}/superadmin/dashboard`,
    landlord: '/landlord/dashboard',
    tenant: '/tenant/dashboard',
    buyer: '/buyer/dashboard',
    agent: '/agent/dashboard',
  };
  const dashboardUrl = dashboardMap[role] || '/landlord/dashboard';

  const handleLoginClick = () => router.push('/login');
  const handleRegisterClick = () => router.push('/register');
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      {/* Top Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <span className={styles.sparkle}>✨</span>
          <span>你的AI好幫手，輕鬆管理你的不動產</span>
          <Link href="/properties" className={styles.bannerLink}>
            立即探索
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          {/* Logo */}
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

          {/* Desktop Navigation */}
          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Actions */}
          <div className={styles.navActions}>
            <ThemeToggle />
            {loading ? (
               // Loading state placeholder
               <div className="w-24 h-10 bg-bg-tertiary rounded animate-pulse" />
            ) : user ? (
              <>
                <Link href={dashboardUrl}>
                  <Button variant="ghost" size="md">
                    儀表板
                  </Button>
                </Link>
                <Button variant="secondary" size="md" onClick={handleLogout}>
                  登出
                </Button>
              </>
            ) : (
              <>
                <Button variant={loginVariant} size="md" onClick={handleLoginClick}>
                  登入
                </Button>
                <Button variant={registerVariant} size="md" onClick={handleRegisterClick}>
                  註冊
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? '關閉選單' : '開啟選單'}
            aria-expanded={isMobileMenuOpen}
          >
            <span className={`${styles.hamburger} ${isMobileMenuOpen ? styles.open : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuContent}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.mobileNavLink} ${pathname === link.href ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.mobileAuthButtons}>
            {user ? (
              <>
                <Link href={dashboardUrl}>
                  <Button variant="ghost" fullWidth>
                    儀表板
                  </Button>
                </Link>
                <Button variant="secondary" fullWidth onClick={handleLogout}>
                  登出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant={loginVariant} fullWidth>
                    登入
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant={registerVariant} fullWidth>
                    註冊
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
