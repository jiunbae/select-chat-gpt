import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getShare, getErrorMessage, NetworkError } from "@/lib/api";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { SharePageClient } from "@/components/SharePageClient";

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

  return <SharePageClient share={share} />;
}
