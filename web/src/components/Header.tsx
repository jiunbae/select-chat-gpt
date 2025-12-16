'use client';

import Link from 'next/link';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  variant?: 'default' | 'transparent';
}

export function Header({ variant = 'default' }: HeaderProps) {
  const isTransparent = variant === 'transparent';

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        isTransparent
          ? 'bg-transparent'
          : 'backdrop-blur-sm bg-white/80 dark:bg-chatgpt-dark/80 border-b border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity text-gray-900 dark:text-white"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <span className="font-semibold">SelectChatGPT</span>
        </Link>

        <LanguageSelector />
      </div>
    </header>
  );
}
