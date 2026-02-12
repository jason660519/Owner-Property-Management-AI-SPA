import type { Metadata } from 'next';
import { Inter, Urbanist } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const urbanist = Urbanist({ subsets: ['latin'], variable: '--font-urbanist' });

export const metadata: Metadata = {
  title: '超級管理員後台 - Owner Property Management',
  description: '系統管理員儀表板與權限管理',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${urbanist.variable} ${inter.variable} font-primary`}>{children}</body>
    </html>
  );
}
