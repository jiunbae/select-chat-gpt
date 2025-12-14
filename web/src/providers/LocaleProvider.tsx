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
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 locale 및 메시지 로드
  useEffect(() => {
    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);

    loadMessages(initialLocale).then((msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!locales.includes(newLocale)) return;

    // localStorage에 저장
    localStorage.setItem(LOCALE_COOKIE_NAME, newLocale);

    // 상태 업데이트 및 메시지 로드
    setLocaleState(newLocale);
    setIsLoading(true);

    loadMessages(newLocale).then((msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });
  }, []);

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
