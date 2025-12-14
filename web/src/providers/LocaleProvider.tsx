'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { locales, defaultLocale, LOCALE_COOKIE_NAME, type Locale } from '@/i18n/config';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  // 1. localStorage에서 저장된 locale 확인
  const stored = localStorage.getItem(LOCALE_COOKIE_NAME);
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }

  // 2. 브라우저 언어 감지
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (locales.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }

  return defaultLocale;
}

// 메시지 캐시
const messagesCache: Partial<Record<Locale, Record<string, string>>> = {};

async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  if (messagesCache[locale]) {
    return messagesCache[locale]!;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;
  messagesCache[locale] = messages;
  return messages;
}

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  // Lazy initialization으로 getInitialLocale이 한 번만 실행되도록 함
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const [messages, setMessages] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // locale 상태가 변경될 때마다 메시지를 로드하고 <html> 태그의 lang 속성을 업데이트
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 접근성 및 SEO를 위해 <html> 태그의 lang 속성 업데이트
    document.documentElement.lang = locale;

    loadMessages(locale)
      .then((msgs) => {
        // Race condition 방지: 컴포넌트가 언마운트되었으면 상태 업데이트 안 함
        if (isMounted) {
          setMessages(msgs);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        // 에러 발생 시 기본 locale로 폴백
        console.error('Failed to load messages:', error);
        if (isMounted) {
          loadMessages(defaultLocale).then((fallbackMsgs) => {
            if (isMounted) {
              setMessages(fallbackMsgs);
              setIsLoading(false);
            }
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    // 동일한 locale이거나 유효하지 않은 locale이면 무시
    if (!locales.includes(newLocale) || newLocale === locale) return;

    // localStorage에 저장
    localStorage.setItem(LOCALE_COOKIE_NAME, newLocale);

    // 상태 업데이트를 통해 useEffect를 트리거
    setLocaleState(newLocale);
  }, [locale]);

  // 메시지 로딩 중이면 최소한의 UI 표시
  if (!messages) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isLoading }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
