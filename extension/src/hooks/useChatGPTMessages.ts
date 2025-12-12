import { useEffect, useState, useCallback } from "react"
import type { ChatMessage } from "~src/types"

const MESSAGE_SELECTORS = [
  '[data-message-author-role]',
  'article[data-testid^="conversation-turn"]',
  '[class*="ConversationItem"]',
  '.group\\/conversation-turn'
]

const USER_ROLE_INDICATORS = [
  '[data-message-author-role="user"]',
  '.agent-turn:not(.model-slug-gpt)'
]

const ASSISTANT_ROLE_INDICATORS = [
  '[data-message-author-role="assistant"]',
  '.agent-turn.model-slug-gpt'
]

// Selectors for thinking/reasoning blocks that should be excluded from content
const THINKING_BLOCK_SELECTORS = [
  'details[data-thinking]',
  '[data-message-content-type="thinking"]',
  '.thinking-block',
  '.reasoning-block',
  '[class*="thinking"]',
  '[class*="reasoning"]',
  'details:has(summary)'  // ChatGPT uses collapsible details for thinking
]

function findMessageElements(): HTMLElement[] {
  for (const selector of MESSAGE_SELECTORS) {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector)
      if (elements.length > 0) {
        return Array.from(elements)
      }
    } catch (e) {
      console.warn(`Selector failed: ${selector}`, e)
    }
  }

  const articles = document.querySelectorAll<HTMLElement>('article')
  if (articles.length > 0) {
    return Array.from(articles)
  }

  return []
}

function determineRole(element: HTMLElement): "user" | "assistant" {
  const roleAttr = element.getAttribute('data-message-author-role')
  if (roleAttr === 'user') return 'user'
  if (roleAttr === 'assistant') return 'assistant'

  for (const selector of USER_ROLE_INDICATORS) {
    if (element.matches(selector) || element.querySelector(selector)) {
      return 'user'
    }
  }

  for (const selector of ASSISTANT_ROLE_INDICATORS) {
    if (element.matches(selector) || element.querySelector(selector)) {
      return 'assistant'
    }
  }

  const text = element.textContent?.toLowerCase() || ''
  if (text.includes('chatgpt') || text.includes('gpt-4') || text.includes('gpt-3')) {
    return 'assistant'
  }

  const imgAlt = element.querySelector('img')?.getAttribute('alt')?.toLowerCase()
  if (imgAlt?.includes('user')) return 'user'
  if (imgAlt?.includes('chatgpt') || imgAlt?.includes('gpt')) return 'assistant'

  return 'user'
}

function extractContent(element: HTMLElement): { content: string; html: string } {
  const contentSelectors = [
    '[data-message-content]',
    '.markdown',
    '.prose',
    '.text-base',
    '.whitespace-pre-wrap'
  ]

  let contentElement: HTMLElement | null = null
  for (const selector of contentSelectors) {
    contentElement = element.querySelector<HTMLElement>(selector)
    if (contentElement) break
  }

  if (!contentElement) {
    contentElement = element
  }

  const cloned = contentElement.cloneNode(true) as HTMLElement

  // Remove UI elements
  cloned.querySelectorAll('button, [role="button"], .copy-button').forEach(el => el.remove())

  // Remove thinking/reasoning blocks from content
  for (const selector of THINKING_BLOCK_SELECTORS) {
    try {
      cloned.querySelectorAll(selector).forEach(el => el.remove())
    } catch (e) {
      // Some selectors like :has() might not be supported in all browsers
      console.warn(`Selector failed: ${selector}`, e)
    }
  }

  return {
    content: cloned.textContent?.trim() || '',
    html: cloned.innerHTML
  }
}

function parseMessages(): ChatMessage[] {
  const elements = findMessageElements()
  const messages: ChatMessage[] = []

  elements.forEach((element, index) => {
    const role = determineRole(element)
    const { content, html } = extractContent(element)

    if (content.length > 0) {
      messages.push({
        id: `msg-${index}`,
        role,
        content,
        html,
        index
      })
    }
  })

  return messages
}

export function useChatGPTMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)

    try {
      setTimeout(() => {
        const parsed = parseMessages()
        if (parsed.length === 0) {
          setError('No messages found. Please refresh the page.')
        } else {
          setMessages(parsed)
        }
        setIsLoading(false)
      }, 500)
    } catch (e) {
      setError('Failed to parse messages.')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { messages, isLoading, error, refresh }
}

export function getPageTitle(): string {
  const titleEl = document.querySelector('h1')
  if (titleEl?.textContent) return titleEl.textContent.trim()

  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle?.getAttribute('content')) return ogTitle.getAttribute('content')!

  return document.title || 'ChatGPT Conversation'
}
