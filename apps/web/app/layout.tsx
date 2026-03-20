import type { Metadata, Viewport } from 'next';
import { Inter, Urbanist } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const urbanist = Urbanist({ subsets: ['latin'], variable: '--font-urbanist' });

export const metadata: Metadata = {
  title: '房東管理系統 - AI 驅動的物業管理平台',
  description: '智能化的房東物業管理系統，提供物件管理、租客管理、合約管理、租金管理等完整功能',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '房東管理',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7C3AED',
};

import Providers from './providers';
import { AuthHashErrorHandler } from '@/components/auth/AuthHashErrorHandler';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="房東管理" />
      </head>
      <body className={`${urbanist.variable} ${inter.variable} font-primary`}>
        <Providers>
          <AuthHashErrorHandler />
          <PerformanceMonitor />
          {children}
        </Providers>
      </body>
    </html>
  );
}
