/**
 * Claude Parser
 *
 * Handles parsing of Claude shared conversations from:
 * - https://claude.ai/share/*
 *
 * Claude's share pages embed conversation data in a script tag with __NEXT_DATA__
 * The data structure contains the full conversation with messages from both human and assistant.
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

const CLAUDE_URL_PATTERN = /^https:\/\/claude\.ai\/share\/[a-zA-Z0-9-]+$/

interface ClaudeMessage {
  uuid: string
  text: string
  sender: 'human' | 'assistant'
  content?: Array<{
    type: string
    text?: string
  }>
}

interface ClaudeShareData {
  props?: {
    pageProps?: {
      sharedConversation?: {
        name?: string
        chat_messages?: ClaudeMessage[]
      }
      // Alternative structure for some share pages
      conversation?: {
        name?: string
        chat_messages?: ClaudeMessage[]
      }
    }
  }
}

export class ClaudeParser implements IChatParser {
  readonly platform = 'claude' as const

  canParse(url: string): boolean {
    return CLAUDE_URL_PATTERN.test(url)
  }

  async parse(url: string): Promise<ParseResult> {
    if (!this.canParse(url)) {
      throw new InvalidUrlError('Invalid Claude share URL')
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
        throw new ConversationNotFoundError('Claude conversation not found')
      }
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Try to find __NEXT_DATA__ script tag (Next.js SSR data)
    const nextDataScript = document.querySelector('script#__NEXT_DATA__')
    if (nextDataScript?.textContent) {
      try {
        const data = JSON.parse(nextDataScript.textContent) as ClaudeShareData
        const result = this.extractFromNextData(data, url)
        if (result) {
          return result
        }
      } catch (e) {
        console.error('Failed to parse Claude __NEXT_DATA__:', e)
      }
    }

    // Fallback: Try to extract from embedded JSON in script tags
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      if (!script.textContent) continue

      // Look for conversation data patterns
      const match = script.textContent.match(/window\.__CLAUDE_DATA__\s*=\s*(\{[\s\S]*?\});/)
      if (match) {
        try {
          const data = JSON.parse(match[1])
          const result = this.extractFromClaudeData(data, url)
          if (result) {
            return result
          }
        } catch (e) {
          console.error('Failed to parse Claude embedded data:', e)
        }
      }
    }

    // Fallback: Try to parse from HTML structure directly
    const result = this.extractFromHTML(document, url)
    if (result) {
      return result
    }

    throw new NoMessagesFoundError('No messages found in Claude conversation. The page format may have changed.')
  }

  private extractFromNextData(data: ClaudeShareData, url: string): ParseResult | null {
    const sharedConv = data.props?.pageProps?.sharedConversation || data.props?.pageProps?.conversation

    if (!sharedConv) return null

    const chatMessages = sharedConv.chat_messages
    if (!chatMessages || chatMessages.length === 0) return null

    const title = sharedConv.name || 'Claude Conversation'

    const messages: ParsedMessage[] = chatMessages
      .filter((msg) => msg.sender === 'human' || msg.sender === 'assistant')
      .map((msg, idx) => {
        // Extract text from content array if available, otherwise use text field
        let content = msg.text || ''
        if (msg.content && Array.isArray(msg.content)) {
          const textContent = msg.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text)
            .join('\n')
          if (textContent) {
            content = textContent
          }
        }

        return {
          id: msg.uuid || `claude-msg-${idx}`,
          role: msg.sender === 'human' ? 'user' : 'assistant',
          content,
          html: ''
        } as ParsedMessage
      })

    if (messages.length === 0) return null

    return {
      title,
      sourceUrl: url,
      messages,
      platform: this.platform
    }
  }

  private extractFromClaudeData(data: unknown, url: string): ParseResult | null {
    // Handle various Claude data structures
    if (!data || typeof data !== 'object') return null

    const record = data as Record<string, unknown>

    // Try common data paths
    const conversation =
      record['conversation'] || record['sharedConversation'] || record['chat'] || record['data']

    if (!conversation || typeof conversation !== 'object') return null

    const conv = conversation as Record<string, unknown>
    const messages = conv['messages'] || conv['chat_messages']

    if (!Array.isArray(messages) || messages.length === 0) return null

    const title = (conv['name'] as string) || (conv['title'] as string) || 'Claude Conversation'

    const parsedMessages: ParsedMessage[] = messages
      .filter((msg: unknown) => {
        if (typeof msg !== 'object' || msg === null) return false
        const m = msg as Record<string, unknown>
        return m['sender'] === 'human' || m['sender'] === 'assistant' || m['role'] === 'user' || m['role'] === 'assistant'
      })
      .map((msg: unknown, idx: number) => {
        const m = msg as Record<string, unknown>
        const sender = m['sender'] || m['role']
        const content = (m['text'] as string) || (m['content'] as string) || ''

        return {
          id: (m['uuid'] as string) || (m['id'] as string) || `claude-msg-${idx}`,
          role: sender === 'human' || sender === 'user' ? 'user' : 'assistant',
          content,
          html: ''
        } as ParsedMessage
      })

    if (parsedMessages.length === 0) return null

    return {
      title,
      sourceUrl: url,
      messages: parsedMessages,
      platform: this.platform
    }
  }

  private extractFromHTML(document: Document, url: string): ParseResult | null {
    // Try to find conversation elements in the DOM
    // Claude uses various class names for message containers

    const messageContainers = document.querySelectorAll(
      '[data-testid="message"], .message-content, .conversation-message, [class*="Message"], [class*="message"]'
    )

    if (messageContainers.length === 0) return null

    const messages: ParsedMessage[] = []

    messageContainers.forEach((container, idx) => {
      const element = container as Element

      // Try to detect role from class names or data attributes
      const classList = element.className || ''
      const isHuman =
        classList.includes('human') ||
        classList.includes('user') ||
        element.getAttribute('data-sender') === 'human' ||
        element.getAttribute('data-role') === 'user'
      const isAssistant =
        classList.includes('assistant') ||
        classList.includes('claude') ||
        element.getAttribute('data-sender') === 'assistant' ||
        element.getAttribute('data-role') === 'assistant'

      // Skip if we can't determine the role
      if (!isHuman && !isAssistant) {
        // Alternate based on position as fallback
        const role = idx % 2 === 0 ? 'user' : 'assistant'
        const content = element.textContent?.trim() || ''
        if (content) {
          messages.push({
            id: `claude-html-msg-${idx}`,
            role,
            content,
            html: ''
          })
        }
        return
      }

      const content = element.textContent?.trim() || ''
      if (content) {
        messages.push({
          id: `claude-html-msg-${idx}`,
          role: isHuman ? 'user' : 'assistant',
          content,
          html: ''
        })
      }
    })

    if (messages.length === 0) return null

    // Try to get title from page
    const titleElement = document.querySelector('title')
    const title = titleElement?.textContent?.replace(' - Claude', '').trim() || 'Claude Conversation'

    return {
      title,
      sourceUrl: url,
      messages,
      platform: this.platform
    }
  }
}
