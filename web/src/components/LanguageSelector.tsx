"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { locales, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

const languageNames: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  zh: "中文",
};

const languageFlags: Record<Locale, string> = {
  en: "🇺🇸",
  ko: "🇰🇷",
  zh: "🇨🇳",
};

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: Locale) => {
    startTransition(() => {
      setLocale(newLocale);
    });
  };

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {languageFlags[loc]} {languageNames[loc]}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
