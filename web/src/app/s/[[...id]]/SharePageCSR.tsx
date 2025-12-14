'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getShare, getErrorMessage, type ApiError } from '@/lib/api';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { SharePageClient } from '@/components/SharePageClient';
import type { Message as MessageType } from '@/lib/api';

interface ShareData {
  id: string;
  title: string;
  sourceUrl: string;
  messages: MessageType[];
  createdAt: string;
  viewCount: number;
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-white dark:bg-chatgpt-dark">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-chatgpt-dark/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
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
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Title skeleton */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-6 animate-pulse" />

        {/* Message skeletons */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function SharePageCSR() {
  const params = useParams();
  // catch-all route에서 id는 string[] | undefined
  const idArray = params.id as string[] | undefined;
  const id = idArray?.[0];

  const [share, setShare] = useState<ShareData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    getShare(id)
      .then((result) => {
        if (result.success) {
          setShare(result.data);
        } else {
          if (result.error.message === 'Share not found') {
            setNotFound(true);
          } else {
            setError(result.error);
          }
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-white dark:bg-chatgpt-dark flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Share not found</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white dark:bg-chatgpt-dark">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-chatgpt-dark/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
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
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-12">
          <ErrorDisplay
            errorType={error.type}
            message={getErrorMessage(error)}
            statusCode={error.statusCode}
          />
        </div>
      </main>
    );
  }

  if (!share) {
    return null;
  }

  return <SharePageClient share={share} />;
}
