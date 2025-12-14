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
export type NetworkErrorType =
  | 'offline'
  | 'server_unreachable'
  | 'timeout'
  | 'server_error'
  | 'invalid_url'
  | 'conversation_not_found'
  | 'no_messages'
  | 'unknown';

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

// 호환성을 위한 별칭
export type ApiError = NetworkError;

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
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 'invalid_url':
      return '올바른 ChatGPT Share URL을 입력해주세요.';
    case 'conversation_not_found':
      return '대화를 찾을 수 없습니다. URL을 확인해주세요.';
    case 'no_messages':
      return '대화에서 메시지를 찾을 수 없습니다.';
    default:
      return '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

// Static Export에서는 항상 클라이언트에서 실행되므로 NEXT_PUBLIC_API_URL만 사용
function getApiBaseUrl(): string {
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

export interface ParseResult {
  shareId: string;
  shareUrl: string;
}

export async function parseUrl(url: string): Promise<ApiResult<ParseResult>> {
  try {
    const apiUrl = getApiBaseUrl();

    const response = await fetchWithErrorHandling(`${apiUrl}/api/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status >= 500) {
        return {
          success: false,
          error: new NetworkError('server_error', data.error || 'Server error', response.status)
        };
      }

      // Map specific error types based on status code and error message
      const errorMessage = (data.error || '').toLowerCase();
      let errorType: NetworkErrorType = 'unknown';

      if (response.status === 404 || errorMessage.includes('not found')) {
        errorType = 'conversation_not_found';
      } else if (errorMessage.includes('invalid') || errorMessage.includes('url')) {
        errorType = 'invalid_url';
      } else if (errorMessage.includes('no messages')) {
        errorType = 'no_messages';
      }

      return {
        success: false,
        error: new NetworkError(errorType, data.error || 'Failed to parse URL', response.status)
      };
    }

    return {
      success: true,
      data: {
        shareId: data.shareId,
        shareUrl: data.shareUrl
      }
    };
  } catch (error) {
    console.error("Failed to parse URL:", error);

    if (error instanceof NetworkError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new NetworkError('unknown', error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

// Share 데이터 조회 - 클라이언트에서만 호출됨
export async function getShare(id: string): Promise<ApiResult<ShareData>> {
  try {
    const apiUrl = getApiBaseUrl();

    const response = await fetchWithErrorHandling(`${apiUrl}/api/shares/${id}`);

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
