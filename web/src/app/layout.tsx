import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans_KR, Noto_Serif_KR, IBM_Plex_Sans_KR } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LanguageSelector } from "@/components/LanguageSelector";
import "./globals.css";

// Pretendard - 인기 있는 한글 산세리프 폰트 (Variable Font)
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

// Noto Sans KR - 구글 한글 산세리프 폰트
// 한글 글리프는 기본 포함되어 있으며, latin은 영문/숫자 지원용
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

// Noto Serif KR - 구글 한글 세리프 폰트
// 한글 글리프는 기본 포함되어 있으며, latin은 영문/숫자 지원용
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

// IBM Plex Sans KR - IBM 한글 산세리프 폰트
// 한글 글리프는 기본 포함되어 있으며, latin은 영문/숫자 지원용
const ibmPlexSansKR = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-kr",
  display: "swap",
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
    <html lang={locale} className={`${pretendard.variable} ${notoSansKR.variable} ${notoSerifKR.variable} ${ibmPlexSansKR.variable}`}>
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
          <div className="fixed top-4 right-4 z-50">
            <LanguageSelector />
          </div>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
