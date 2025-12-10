import type { ShareRequest, ShareResponse } from "~src/types"

const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'https://api.selectchatgpt.jiun.dev'

// 네트워크 에러 타입 정의
export type NetworkErrorType = 'offline' | 'server_unreachable' | 'timeout' | 'server_error' | 'unknown'

export class NetworkError extends Error {
  type: NetworkErrorType
  statusCode?: number

  constructor(type: NetworkErrorType, message: string, statusCode?: number) {
    super(message)
    this.name = 'NetworkError'
    this.type = type
    this.statusCode = statusCode
  }
}

// 네트워크 연결 상태 확인
export function isOnline(): boolean {
  return navigator.onLine
}

// 에러 타입에 따른 사용자 친화적 메시지
export function getErrorMessage(error: NetworkError): string {
  switch (error.type) {
    case 'offline':
      return '인터넷 연결이 끊겼습니다. 네트워크 연결을 확인해주세요.'
    case 'server_unreachable':
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
    case 'timeout':
      return '서버 응답 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.'
    case 'server_error':
      return `서버 오류가 발생했습니다. (${error.statusCode || '알 수 없음'})`
    default:
      return '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'
  }
}

// fetch 래퍼 - 오프라인 및 타임아웃 처리
async function fetchWithErrorHandling(url: string, options?: RequestInit & { timeout?: number }): Promise<Response> {
  // 오프라인 체크
  if (!isOnline()) {
    throw new NetworkError('offline', 'No internet connection')
  }

  const timeout = options?.timeout ?? 30000 // 기본 30초 타임아웃

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    // 오프라인 상태 재확인 (요청 중 연결이 끊겼을 수 있음)
    if (!isOnline()) {
      throw new NetworkError('offline', 'No internet connection')
    }

    // AbortError는 타임아웃
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('timeout', 'Request timeout')
    }

    // TypeError는 일반적으로 네트워크 실패 (서버 unreachable, CORS 등)
    if (error instanceof TypeError) {
      throw new NetworkError('server_unreachable', 'Cannot reach server')
    }

    throw new NetworkError('unknown', error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function createShare(data: ShareRequest): Promise<ShareResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/api/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    if (response.status >= 500) {
      throw new NetworkError('server_error', 'Server error', response.status)
    }
    const error = await response.json().catch(() => ({ message: 'Failed to create share' }))
    throw new Error(error.message || 'Failed to create share')
  }

  return response.json()
}

export async function getShare(id: string): Promise<ShareResponse> {
  const response = await fetchWithErrorHandling(`${API_BASE_URL}/api/shares/${id}`)

  if (!response.ok) {
    if (response.status >= 500) {
      throw new NetworkError('server_error', 'Server error', response.status)
    }
    throw new Error('Share not found')
  }

  return response.json()
}
