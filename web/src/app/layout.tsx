import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LanguageSelector } from "@/components/LanguageSelector";
import "./globals.css";

// Pretendard CDN URL - unicode-range subset이 적용되어 필요한 글자만 로드
// 기존 로컬 폰트(2.1MB)에서 CDN으로 전환하여 초기 로드 성능 개선
const PRETENDARD_CDN_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata: Metadata = {
  title: "SelectChatGPT - Share Selected ChatGPT Messages",
  description: "View and share selected messages from ChatGPT conversations",
  openGraph: {
    title: "SelectChatGPT",
    description: "Share selected messages from ChatGPT conversations",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SelectChatGPT",
    description: "Share selected messages from ChatGPT conversations",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Pretendard 폰트 - CDN에서 dynamic subset으로 로드 */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href={PRETENDARD_CDN_URL}
        />
        {/* Google Analytics 4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        {/* Google AdSense */}
        {ADSENSE_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <div className="fixed top-4 right-4 z-[100]">
            <LanguageSelector />
          </div>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
