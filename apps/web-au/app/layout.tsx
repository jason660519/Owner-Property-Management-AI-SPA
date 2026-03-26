import type { Metadata, Viewport } from 'next';
import { Inter, Urbanist } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const urbanist = Urbanist({ subsets: ['latin'], variable: '--font-urbanist' });

export const metadata: Metadata = {
  title: 'PropAI Australia — AI-Powered Property Management',
  description:
    'Manage your Australian property portfolio with AI: listings, tenant screening, leases, maintenance, and more.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PropAI AU',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7C3AED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${urbanist.variable} ${inter.variable} font-primary`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
