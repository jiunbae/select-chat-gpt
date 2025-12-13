import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LanguageSelector } from "@/components/LanguageSelector";
import "./globals.css";

// Pretendard - 기본 한글 폰트 (Variable Font)
// 다른 폰트(Noto Sans KR, Noto Serif KR, IBM Plex Sans KR)는
// 사용자가 선택할 때 동적으로 로드됩니다 (lib/font-loader.ts 참조)
const pretendard = localFont({
  src: [
    {
      path: "./fonts/PretendardVariable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", "sans-serif"],
});

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
    <html lang={locale} className={pretendard.variable}>
      <head>
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
