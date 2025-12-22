import type { Metadata } from "next";
import { Noto_Sans_JP, Inter } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { FloatingLineButton } from "@/components/layout/FloatingLineButton";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amber - プロフェッショナルな清掃予約プラットフォーム",
  description: "エアコンクリーニングから家事代行まで、プロの清掃サービスを24時間オンラインで予約。信頼の技術で、あなたの家に輝きを。",
};

import { PWALoader } from "@/components/pwa/pwa-loader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d97706" />
      </head>
      <body
        className={`${notoSansJP.variable} ${inter.variable} font-sans antialiased`}
      >
        <PWALoader />
        {children}
        <ChatWidget />
        <FloatingLineButton />
      </body>
    </html>
  );
}
