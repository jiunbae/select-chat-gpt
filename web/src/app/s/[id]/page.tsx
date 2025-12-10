import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getShare, getErrorMessage, NetworkError } from "@/lib/api";
import { Message } from "@/components/Message";
import { AdUnit } from "@/components/AdUnit";
import { ErrorDisplay } from "@/components/ErrorDisplay";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getShare(id);

  if (!result.success) {
    return {
      title: "Error - SelectChatGPT",
    };
  }

  return {
    title: `${result.data.title} - SelectChatGPT`,
    description: `Shared conversation with ${result.data.messages.length} messages`,
    openGraph: {
      title: result.data.title,
      description: `Shared conversation with ${result.data.messages.length} messages`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: result.data.title,
      description: `Shared conversation with ${result.data.messages.length} messages`,
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const result = await getShare(id);

  if (!result.success) {
    // Share not found (404) vs 서버 연결 에러 구분
    if (result.error.message === 'Share not found') {
      notFound();
    }

    // 서버 연결 에러인 경우 에러 페이지 표시
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
            errorType={result.error.type}
            message={getErrorMessage(result.error)}
            statusCode={result.error.statusCode}
          />
        </div>
      </main>
    );
  }

  const share = result.data;
  const formattedDate = new Date(share.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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

          <a
            href={share.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View Original
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {share.title}
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{share.messages.length} messages</span>
          <span>•</span>
          <span>{share.viewCount} views</span>
        </div>
      </div>

      {/* Top Ad */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <AdUnit slot="TOP_AD_SLOT" format="horizontal" className="w-full" />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700">
        {share.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>

      {/* Bottom Ad */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AdUnit slot="BOTTOM_AD_SLOT" format="horizontal" className="w-full" />
      </div>

      <footer className="border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This conversation was shared using SelectChatGPT
          </p>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Get the Extension
          </a>
        </div>
      </footer>
    </main>
  );
}
