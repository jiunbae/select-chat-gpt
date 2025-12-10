export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  html: string;
}

export interface ShareData {
  id: string;
  title: string;
  sourceUrl: string;
  messages: Message[];
  createdAt: string;
  viewCount: number;
}

// 네트워크 에러 타입 정의
export type NetworkErrorType = 'offline' | 'server_unreachable' | 'timeout' | 'server_error' | 'unknown';

export class NetworkError extends Error {
  type: NetworkErrorType;
  statusCode?: number;

  constructor(type: NetworkErrorType, message: string, statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// API 응답 결과 타입
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: NetworkError };

// 에러 타입에 따른 사용자 친화적 메시지
export function getErrorMessage(error: NetworkError): string {
  switch (error.type) {
    case 'offline':
      return '인터넷 연결이 끊겼습니다. 네트워크 연결을 확인해주세요.';
    case 'server_unreachable':
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
    case 'timeout':
      return '서버 응답 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.';
    case 'server_error':
      return `서버 오류가 발생했습니다. (${error.statusCode || '알 수 없음'})`;
    default:
      return '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

// 서버 사이드 (SSR)에서는 Docker 내부 URL 사용, 클라이언트에서는 외부 URL 사용
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }
  // Client-side: use public URL
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

// fetch 래퍼 - 오프라인 및 타임아웃 처리
async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<Response> {
  const timeout = options?.timeout ?? 30000; // 기본 30초 타임아웃

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // AbortError는 타임아웃
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('timeout', 'Request timeout');
    }

    // TypeError는 일반적으로 네트워크 실패 (서버 unreachable, DNS 실패 등)
    if (error instanceof TypeError) {
      throw new NetworkError('server_unreachable', 'Cannot reach server');
    }

    // 기타 fetch 에러 (네트워크 에러)
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new NetworkError('server_unreachable', 'Cannot reach server');
    }

    throw new NetworkError('unknown', error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function getShare(id: string): Promise<ApiResult<ShareData>> {
  try {
    const apiUrl = getApiBaseUrl();
    console.log(`[API] Fetching share ${id} from ${apiUrl}`);

    const response = await fetchWithErrorHandling(`${apiUrl}/api/shares/${id}`, {
      next: { revalidate: 60 },
    } as RequestInit);

    if (!response.ok) {
      if (response.status >= 500) {
        return {
          success: false,
          error: new NetworkError('server_error', 'Server error', response.status)
        };
      }
      // 404나 다른 클라이언트 에러
      return {
        success: false,
        error: new NetworkError('unknown', 'Share not found')
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch share:", error);

    if (error instanceof NetworkError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new NetworkError('unknown', error instanceof Error ? error.message : 'Unknown error')
    };
  }
}
