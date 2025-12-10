"use client";

import { NetworkErrorType } from "@/lib/api";

interface ErrorDisplayProps {
  errorType: NetworkErrorType;
  message: string;
  statusCode?: number;
}

function getErrorIcon(errorType: NetworkErrorType) {
  switch (errorType) {
    case "offline":
      return (
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-7.072m0 0L9.88 5.636m0 0A9 9 0 003 12m0 0l2.829 2.829M3 12l-2.829-2.829"
          />
        </svg>
      );
    case "server_unreachable":
    case "timeout":
      return (
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
          <line
            x1="4"
            y1="4"
            x2="20"
            y2="20"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      );
    case "server_error":
      return (
        <svg
          className="w-16 h-16 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

function getErrorTitle(errorType: NetworkErrorType) {
  switch (errorType) {
    case "offline":
      return "인터넷 연결 없음";
    case "server_unreachable":
      return "서버에 연결할 수 없음";
    case "timeout":
      return "연결 시간 초과";
    case "server_error":
      return "서버 오류";
    default:
      return "오류 발생";
  }
}

export function ErrorDisplay({
  errorType,
  message,
  statusCode,
}: ErrorDisplayProps) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      {getErrorIcon(errorType)}

      <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
        {getErrorTitle(errorType)}
      </h2>

      <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
        {message}
      </p>

      {statusCode && (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Error code: {statusCode}
        </p>
      )}

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          다시 시도
        </button>

        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          홈으로
        </a>
      </div>

      {errorType === "offline" && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>팁:</strong> Wi-Fi나 모바일 데이터가 연결되어 있는지
            확인해주세요.
          </p>
        </div>
      )}

      {(errorType === "server_unreachable" || errorType === "timeout") && (
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg max-w-md">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>팁:</strong> 서버가 일시적으로 점검 중이거나 네트워크
            문제일 수 있습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
