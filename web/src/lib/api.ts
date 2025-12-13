import { cache } from 'react';

// Simple LRU Cache with TTL for API responses
class LRUCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 100, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    // Delete if exists to update order
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance for share data (100 entries, 5 min TTL)
const shareCache = new LRUCache<ShareData>(100, 5 * 60 * 1000);

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

// Internal function for fetching share data with LRU caching
async function getShareInternal(id: string): Promise<ApiResult<ShareData>> {
  // Check LRU cache first (server-side only, not during SSG)
  if (typeof window === 'undefined') {
    const cached = shareCache.get(id);
    if (cached) {
      console.log(`[API] Cache hit for share ${id}`);
      return { success: true, data: cached };
    }
  }

  try {
    const apiUrl = getApiBaseUrl();
    console.log(`[API] Fetching share ${id} from ${apiUrl}`);

    const response = await fetchWithErrorHandling(`${apiUrl}/api/shares/${id}`, {
      next: { revalidate: 60 },
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
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

    // Store in LRU cache (server-side only)
    if (typeof window === 'undefined') {
      shareCache.set(id, data);
      console.log(`[API] Cached share ${id}`);
    }

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

// Cached version of getShare - prevents duplicate API calls
// within the same React Server Component render cycle
// (e.g., between generateMetadata and page component)
export const getShare = cache(getShareInternal);
