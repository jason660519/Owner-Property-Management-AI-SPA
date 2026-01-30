import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Estatein - 房東物業的 AI 好幫手",
    template: "%s | Estatein",
  },
  description: "透過 AI 智能平台，輕鬆管理您的不動產資產。無論是租賃管理、物業維護還是收益優化，我們都能為您提供全方位的解決方案。",
  keywords: ["物業管理", "房地產", "AI", "租賃管理", "房東", "不動產", "智能管理"],
  authors: [{ name: "Estatein" }],
  creator: "Estatein",
  metadataBase: new URL("https://estatein.com"),
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "Estatein",
    title: "Estatein - 房東物業的 AI 好幫手",
    description: "透過 AI 智能平台，輕鬆管理您的不動產資產。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Estatein - 房東物業的 AI 好幫手",
    description: "透過 AI 智能平台，輕鬆管理您的不動產資產。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141414",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
