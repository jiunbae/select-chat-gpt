/**
 * Gemini Parser
 *
 * Handles parsing of Gemini shared conversations from:
 * - https://gemini.google.com/share/*
 * - https://g.co/gemini/share/*
 *
 * Gemini's share pages embed conversation data in various formats:
 * - Server-side rendered HTML with specific class names
 * - Embedded JSON data in script tags
 * - __INITIAL_STATE__ or similar data structures
 */

import { JSDOM } from 'jsdom'
import {
  IChatParser,
  ParseResult,
  ParsedMessage,
  ConversationNotFoundError,
  NoMessagesFoundError,
  InvalidUrlError
} from './index.js'

const GEMINI_URL_PATTERNS = [
  /^https:\/\/gemini\.google\.com\/share\/[a-zA-Z0-9]+$/,
  /^https:\/\/g\.co\/gemini\/share\/[a-zA-Z0-9]+$/
]

interface GeminiMessage {
  id?: string
  role?: string
  author?: string
  text?: string
  content?: string | Array<{ text?: string }>
  parts?: Array<{ text?: string }>
}

interface GeminiConversation {
  title?: string
  name?: string
  messages?: GeminiMessage[]
  turns?: GeminiMessage[]
  conversation?: GeminiMessage[]
}

export class GeminiParser implements IChatParser {
  readonly platform = 'gemini' as const

  canParse(url: string): boolean {
    return GEMINI_URL_PATTERNS.some((pattern) => pattern.test(url))
  }

  async parse(url: string): Promise<ParseResult> {
    if (!this.canParse(url)) {
      throw new InvalidUrlError('Invalid Gemini share URL')
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new ConversationNotFoundError('Gemini conversation not found')
      }
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Try multiple extraction methods

    // Method 1: Look for embedded JSON data in script tags
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      if (!script.textContent) continue

      // Look for various data patterns used by Gemini
      const patterns = [
        /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
        /window\.__DATA__\s*=\s*(\{[\s\S]*?\});/,
        /AF_initDataCallback\(\{[^}]*data:\s*(\[[\s\S]*?\])\s*\}/,
        /"conversation":\s*(\{[\s\S]*?\})\s*[,}]/
      ]

      for (const pattern of patterns) {
        const match = script.textContent.match(pattern)
        if (match) {
          try {
            const data = JSON.parse(match[1])
            const result = this.extractFromData(data, url)
            if (result) {
              return result
            }
          } catch (e) {
            // Continue trying other patterns
          }
        }
      }

      // Also try to find JSON arrays that might contain conversation data
      const jsonArrayMatch = script.textContent.match(/\[\s*\[\s*"wrb\.fr"[\s\S]*?\]\s*\]/)
      if (jsonArrayMatch) {
        try {
          const result = this.extractFromWrbData(jsonArrayMatch[0], url)
          if (result) {
            return result
          }
        } catch (e) {
          // Continue
        }
      }
    }

    // Method 2: Parse from HTML structure
    const result = this.extractFromHTML(document, url)
    if (result) {
      return result
    }

    throw new NoMessagesFoundError('No messages found in Gemini conversation. The page format may have changed.')
  }

  private extractFromData(data: unknown, url: string): ParseResult | null {
    if (!data || typeof data !== 'object') return null

    // Handle different data structures
    const record = data as Record<string, unknown>

    // Try to find conversation data in various paths
    const conversation = this.findConversationData(record)
    if (!conversation) return null

    const title = (conversation.title as string) || (conversation.name as string) || 'Gemini Conversation'
    const messageArray = conversation.messages || conversation.turns || conversation.conversation

    if (!Array.isArray(messageArray) || messageArray.length === 0) return null

    const messages = this.parseMessages(messageArray)
    if (messages.length === 0) return null

    return {
      title,
      sourceUrl: url,
      messages,
      platform: this.platform
    }
  }

  private findConversationData(data: Record<string, unknown>): GeminiConversation | null {
    // Direct conversation object
    if (data.messages || data.turns || data.conversation) {
      return data as GeminiConversation
    }

    // Nested in common paths
    const paths = ['conversation', 'data', 'sharedConversation', 'chat', 'thread']
    for (const path of paths) {
      const nested = data[path]
      if (nested && typeof nested === 'object') {
        const nestedRecord = nested as Record<string, unknown>
        if (nestedRecord.messages || nestedRecord.turns || nestedRecord.conversation) {
          return nestedRecord as GeminiConversation
        }
      }
    }

    // Deep search for messages array
    for (const key of Object.keys(data)) {
      const value = data[key]
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0]
        if (first && typeof first === 'object') {
          const record = first as Record<string, unknown>
          if ('role' in record || 'author' in record || 'text' in record || 'content' in record) {
            return { messages: value as GeminiMessage[] }
          }
        }
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const result = this.findConversationData(value as Record<string, unknown>)
        if (result) return result
      }
    }

    return null
  }

  private parseMessages(messageArray: GeminiMessage[]): ParsedMessage[] {
    const messages: ParsedMessage[] = []

    for (let idx = 0; idx < messageArray.length; idx++) {
      const msg = messageArray[idx]
      if (!msg || typeof msg !== 'object') continue

      // Determine role
      let role: 'user' | 'assistant'
      const msgRole = msg.role || msg.author
      if (msgRole === 'user' || msgRole === 'USER' || msgRole === 'human' || msgRole === '0') {
        role = 'user'
      } else if (
        msgRole === 'model' ||
        msgRole === 'MODEL' ||
        msgRole === 'assistant' ||
        msgRole === 'gemini' ||
        msgRole === '1'
      ) {
        role = 'assistant'
      } else {
        // Alternate based on position as fallback
        role = idx % 2 === 0 ? 'user' : 'assistant'
      }

      // Extract content
      let content = ''

      if (typeof msg.text === 'string') {
        content = msg.text
      } else if (typeof msg.content === 'string') {
        content = msg.content
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .map((c) => c.text || '')
          .filter(Boolean)
          .join('\n')
      } else if (Array.isArray(msg.parts)) {
        content = msg.parts
          .map((p) => p.text || '')
          .filter(Boolean)
          .join('\n')
      }

      if (content.trim()) {
        messages.push({
          id: msg.id || `gemini-msg-${idx}`,
          role,
          content: content.trim(),
          html: ''
        })
      }
    }

    return messages
  }

  private extractFromWrbData(jsonStr: string, url: string): ParseResult | null {
    try {
      const data = JSON.parse(jsonStr)
      if (!Array.isArray(data)) return null

      // Gemini's wrb.fr format is complex, try to find conversation data
      const messages: ParsedMessage[] = []

      const extractMessages = (arr: unknown[]): void => {
        for (const item of arr) {
          if (typeof item === 'string' && item.length > 20) {
            // Could be a message content, but we need context to determine role
            // Skip for now as we need proper structure
          } else if (Array.isArray(item)) {
            extractMessages(item)
          } else if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>
            if (record.text || record.content) {
              const role = record.author === 'user' || record.role === 'user' ? 'user' : 'assistant'
              const content = (record.text as string) || (record.content as string) || ''
              if (content.trim()) {
                messages.push({
                  id: (record.id as string) || `gemini-wrb-${messages.length}`,
                  role,
                  content: content.trim(),
                  html: ''
                })
              }
            }
          }
        }
      }

      extractMessages(data)

      if (messages.length === 0) return null

      return {
        title: 'Gemini Conversation',
        sourceUrl: url,
        messages,
        platform: this.platform
      }
    } catch (e) {
      return null
    }
  }

  private extractFromHTML(document: Document, url: string): ParseResult | null {
    // Gemini uses various class names for message containers
    // Common patterns: message-content, user-query, model-response, etc.

    const messageSelectors = [
      '.message-content',
      '.user-query',
      '.model-response',
      '[class*="query"]',
      '[class*="response"]',
      '[class*="turn"]',
      '[data-message-role]',
      '.conversation-turn'
    ]

    let messageElements: Element[] = []

    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        messageElements = Array.from(elements)
        break
      }
    }

    // If no specific selectors work, try to find message pairs
    if (messageElements.length === 0) {
      // Look for common container patterns
      const containers = document.querySelectorAll('[class*="message"], [class*="chat"], [class*="conversation"]')
      messageElements = Array.from(containers).filter((el) => {
        const text = el.textContent?.trim() || ''
        return text.length > 10 && text.length < 50000 // Reasonable message size
      })
    }

    if (messageElements.length === 0) return null

    const messages: ParsedMessage[] = []

    messageElements.forEach((element, idx) => {
      const classList = element.className || ''
      const dataRole = element.getAttribute('data-message-role')

      // Try to detect role from class names or data attributes
      const isUser =
        classList.includes('user') ||
        classList.includes('query') ||
        classList.includes('human') ||
        dataRole === 'user'
      const isAssistant =
        classList.includes('model') ||
        classList.includes('response') ||
        classList.includes('gemini') ||
        classList.includes('assistant') ||
        dataRole === 'model' ||
        dataRole === 'assistant'

      let role: 'user' | 'assistant'
      if (isUser) {
        role = 'user'
      } else if (isAssistant) {
        role = 'assistant'
      } else {
        // Alternate based on position
        role = idx % 2 === 0 ? 'user' : 'assistant'
      }

      const content = element.textContent?.trim() || ''
      if (content) {
        messages.push({
          id: `gemini-html-${idx}`,
          role,
          content,
          html: ''
        })
      }
    })

    if (messages.length === 0) return null

    // Try to get title from page
    const titleElement = document.querySelector('title')
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const title =
      ogTitle?.getAttribute('content') ||
      titleElement?.textContent?.replace(' - Gemini', '').replace('Gemini - ', '').trim() ||
      'Gemini Conversation'

    return {
      title,
      sourceUrl: url,
      messages,
      platform: this.platform
    }
  }
}
