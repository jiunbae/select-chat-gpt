import { useState, useMemo, useCallback } from "react"
import type { ChatMessage } from "~src/types"
import type { RoleFilter } from "~src/components/SearchBar"

interface UseMessageFilterOptions {
  messages: ChatMessage[]
}

interface UseMessageFilterReturn {
  // 필터 상태
  searchQuery: string
  roleFilter: RoleFilter
  codeOnly: boolean

  // 필터 상태 변경 함수
  setSearchQuery: (query: string) => void
  setRoleFilter: (role: RoleFilter) => void
  setCodeOnly: (codeOnly: boolean) => void

  // 필터링된 결과
  filteredMessages: ChatMessage[]
  filteredIds: Set<string>
  matchedCount: number

  // 유틸리티 함수
  selectLastN: (n: number) => string[]
  clearFilters: () => void
  hasActiveFilters: boolean

  // 검색어 하이라이트용
  highlightText: (text: string) => { text: string; isHighlight: boolean }[]
}

/**
 * 메시지에 코드 블록이 포함되어 있는지 확인
 */
function hasCodeBlock(message: ChatMessage): boolean {
  // HTML에서 코드 블록 확인
  if (message.html) {
    const hasPreCode = /<pre[^>]*>.*<code/i.test(message.html)
    const hasCodeTag = /<code[^>]*>/i.test(message.html)
    if (hasPreCode || hasCodeTag) return true
  }

  // 마크다운 코드 블록 패턴 확인 (```)
  if (message.content) {
    const hasMarkdownCodeBlock = /```[\s\S]*?```/.test(message.content)
    const hasInlineCode = /`[^`]+`/.test(message.content)
    if (hasMarkdownCodeBlock || hasInlineCode) return true
  }

  return false
}

/**
 * 검색어가 메시지에 포함되어 있는지 확인 (대소문자 무시)
 */
function matchesSearch(message: ChatMessage, query: string): boolean {
  if (!query) return true
  const lowerQuery = query.toLowerCase()
  return message.content.toLowerCase().includes(lowerQuery)
}

/**
 * 역할 필터 확인
 */
function matchesRole(message: ChatMessage, role: RoleFilter): boolean {
  if (role === "all") return true
  return message.role === role
}

export function useMessageFilter({ messages }: UseMessageFilterOptions): UseMessageFilterReturn {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [codeOnly, setCodeOnly] = useState(false)

  // 필터링된 메시지 계산
  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      // 역할 필터
      if (!matchesRole(message, roleFilter)) return false

      // 검색어 필터
      if (!matchesSearch(message, searchQuery)) return false

      // 코드 포함 필터
      if (codeOnly && !hasCodeBlock(message)) return false

      return true
    })
  }, [messages, searchQuery, roleFilter, codeOnly])

  // 필터링된 메시지 ID Set
  const filteredIds = useMemo(() => {
    return new Set(filteredMessages.map((m) => m.id))
  }, [filteredMessages])

  // 활성 필터 여부
  const hasActiveFilters = searchQuery.length > 0 || roleFilter !== "all" || codeOnly

  // 마지막 N개 메시지 선택
  const selectLastN = useCallback(
    (n: number): string[] => {
      const targetMessages = hasActiveFilters ? filteredMessages : messages
      const startIndex = Math.max(0, targetMessages.length - n)
      return targetMessages.slice(startIndex).map((m) => m.id)
    },
    [messages, filteredMessages, hasActiveFilters]
  )

  // 필터 초기화
  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setRoleFilter("all")
    setCodeOnly(false)
  }, [])

  // 검색어 하이라이트 분할
  const highlightText = useCallback(
    (text: string): { text: string; isHighlight: boolean }[] => {
      if (!searchQuery) {
        return [{ text, isHighlight: false }]
      }

      const parts: { text: string; isHighlight: boolean }[] = []
      const lowerText = text.toLowerCase()
      const lowerQuery = searchQuery.toLowerCase()

      let lastIndex = 0
      let index = lowerText.indexOf(lowerQuery)

      while (index !== -1) {
        // 매치 이전 부분
        if (index > lastIndex) {
          parts.push({
            text: text.substring(lastIndex, index),
            isHighlight: false,
          })
        }

        // 매치된 부분
        parts.push({
          text: text.substring(index, index + searchQuery.length),
          isHighlight: true,
        })

        lastIndex = index + searchQuery.length
        index = lowerText.indexOf(lowerQuery, lastIndex)
      }

      // 마지막 부분
      if (lastIndex < text.length) {
        parts.push({
          text: text.substring(lastIndex),
          isHighlight: false,
        })
      }

      return parts
    },
    [searchQuery]
  )

  return {
    searchQuery,
    roleFilter,
    codeOnly,
    setSearchQuery,
    setRoleFilter,
    setCodeOnly,
    filteredMessages,
    filteredIds,
    matchedCount: filteredMessages.length,
    selectLastN,
    clearFilters,
    hasActiveFilters,
    highlightText,
  }
}
