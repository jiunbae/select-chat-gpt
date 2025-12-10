export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  html: string
  index: number
}

export interface ShareRequest {
  title: string
  sourceUrl: string
  messages: Omit<ChatMessage, "index">[]
}

export interface ShareResponse {
  id: string
  url: string
  expiresAt: string | null
}

export interface ShareData {
  id: string
  title: string
  sourceUrl: string
  messages: Omit<ChatMessage, "index">[]
  createdAt: string
}

export type ExportFormat = 'png' | 'pdf'

// Re-export from common package
export type { ExportStyleType } from '@selectchatgpt/common/export'

export interface ExportOptions {
  format: ExportFormat
  styleType: import('@selectchatgpt/common/export').ExportStyleType
}
