"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseUrl, getErrorMessage } from "@/lib/api";
import { Analytics } from "@/lib/analytics";

export function UrlInput() {
  const t = useTranslations('urlInput');
  const tHome = useTranslations('home');
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError(t('errorEmpty'));
      return;
    }

    // Validate ChatGPT share URL pattern
    if (!trimmedUrl.startsWith("https://chatgpt.com/share/") && !trimmedUrl.startsWith("https://chat.openai.com/share/")) {
      setError(t('errorInvalid'));
      return;
    }

    setIsLoading(true);
    setError(null);

    // Track URL submission
    Analytics.urlSubmitted(trimmedUrl);

    const result = await parseUrl(trimmedUrl);

    setIsLoading(false);

    if (result.success) {
      // Track parse success
      Analytics.parseSuccess(result.data.shareId);
      router.push(result.data.shareUrl);
    } else {
      // Track parse failure
      Analytics.parseFailed(getErrorMessage(result.error));
      setError(getErrorMessage(result.error));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {tHome('urlSectionTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {tHome('urlSectionDesc')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder={t('placeholder')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('loading')}
            </>
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
              {t('load')}
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        {t('example')}
      </p>
    </div>
  );
}
