import { JSDOM } from 'jsdom'
import { createShare, CreateShareInput, ShareOutput } from './share.service.js'

export interface ParsedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  html: string
  messageType?: 'text' | 'code' | 'thinking'
  thinkingSummary?: string  // e.g., "8s 동안 생각함"
}

export interface ParseResult {
  title: string
  sourceUrl: string
  messages: ParsedMessage[]
}

// Custom error types for better error handling
export class ConversationNotFoundError extends Error {
  constructor(message = 'ChatGPT conversation not found') {
    super(message)
    this.name = 'ConversationNotFoundError'
  }
}

export class NoMessagesFoundError extends Error {
  constructor(message = 'No messages found in the conversation') {
    super(message)
    this.name = 'NoMessagesFoundError'
  }
}

export class InvalidUrlError extends Error {
  constructor(message = 'Invalid ChatGPT share URL') {
    super(message)
    this.name = 'InvalidUrlError'
  }
}

// Constants for magic numbers
const MIN_REACT_ROUTER_DATA_LENGTH = 1000
const CONTENT_TYPE_LOOKBEHIND_WINDOW = 15

const CHATGPT_URL_PATTERNS = [
  /^https:\/\/chatgpt\.com\/share\/[a-zA-Z0-9-]+$/,
  /^https:\/\/chat\.openai\.com\/share\/[a-zA-Z0-9-]+$/
]

export function isValidChatGPTShareUrl(url: string): boolean {
  return CHATGPT_URL_PATTERNS.some(pattern => pattern.test(url))
}

// Keywords and patterns that indicate metadata, not user content
const METADATA_KEYWORDS = new Set([
  'user', 'assistant', 'system', 'text', 'parts', 'role', 'content',
  'metadata', 'author', 'message', 'status', 'finished_successfully',
  'all', 'recipient', 'weight', 'end_turn', 'children', 'parent',
  'id', 'mapping', 'create_time', 'update_time', 'model_slug',
  'default_model_slug', 'parent_id', 'channel', 'final', 'stop', 'stop_tokens',
  'finish_details', 'is_complete', 'citations', 'content_references', 'message_type',
  'next', 'origin', 'ntp', 'client_id', 'client_capability_version', 'sources',
  'request_id', 'message_source', 'turn_exchange_id', 'rebase_system_message',
  'sonic_classification_result', 'latency_ms', 'search_decision', 'classifier_config',
  'content_type', 'is_visually_hidden_from_conversation', 'shared_conversation_id',
  'loaderData', 'root', 'dd', 'traceId', 'traceTime', 'disablePrefetch',
  'shouldPrefetchAccount', 'shouldPrefetchUser', 'shouldPrefetchSystemHints',
  'promoteCss', 'disableSSR', 'statsigGateEvaluationsPromise', 'sharedConversationId',
  'serverResponse', 'type', 'data', 'client-created-root', 'history_off_approved',
  'thinking', 'reasoning', 'summary', 'model_switcher_deny'
])

// Content types that should be skipped (like thinking/reasoning blocks)
const SKIP_CONTENT_TYPES = new Set(['thinking', 'reasoning'])

// Patterns that indicate Python code
const PYTHON_CODE_PATTERNS = [
  /^import\s+\w+/m,           // import statements
  /^from\s+\w+\s+import/m,    // from X import Y
  /^def\s+\w+\s*\(/m,         // function definitions
  /^class\s+\w+/m,            // class definitions
  /^for\s+\w+\s+in\s+/m,      // for loops
  /^while\s+.+:/m,            // while loops
  /^if\s+.+:/m,               // if statements
  /^\s{4,}(return|print|self\.)/m,  // indented code
  /^[a-z_]\w*\s*=\s*.+$/m,    // variable assignments
  /^print\s*\(/m,             // print statements
]

function looksLikePythonCode(content: string): boolean {
  // Skip if content has significant Korean/CJK characters (not code)
  const koreanChars = content.match(/[\u3131-\uD79D\u4E00-\u9FFF]/g)
  if (koreanChars && koreanChars.length > 5) {
    return false
  }

  // Check if content matches common Python patterns
  const lines = content.split('\n').slice(0, 5) // Check first 5 lines
  const firstLines = lines.join('\n')

  // Must start with a code pattern (not just contain it)
  for (const pattern of PYTHON_CODE_PATTERNS) {
    if (pattern.test(firstLines)) {
      return true
    }
  }

  return false
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DOMAIN_LIST_PATTERN = /^[a-z0-9.-]+\.(com|org|net|edu|io|co|au)(,\s*[a-z0-9.-]+\.(com|org|net|edu|io|co|au))*$/i

function isValidMessageContent(val: unknown): val is string {
  if (typeof val !== 'string') return false
  if (val.length < 2) return false

  // Skip metadata keywords
  if (METADATA_KEYWORDS.has(val) || METADATA_KEYWORDS.has(val.toLowerCase())) return false

  // Skip UUIDs
  if (UUID_PATTERN.test(val)) return false

  // Skip pure numbers
  if (/^\d+$/.test(val)) return false

  // Skip timestamps (float numbers)
  if (/^\d+\.\d+$/.test(val)) return false

  // Skip model names
  if (/^gpt-\d/.test(val)) return false

  // Skip short alphanumeric IDs (like 'kaur1br5', 'naefu')
  if (/^[a-z0-9]{4,12}$/.test(val) && !/\s/.test(val)) return false

  // Skip single domain strings
  if (/^[a-z0-9.-]+\.(com|org|net|edu|io|co|au)$/i.test(val)) return false

  // Skip domain list strings (like "openai.com, mail.openai.com")
  if (DOMAIN_LIST_PATTERN.test(val)) return false

  // Skip internal system strings
  if (val.startsWith('_') || val.startsWith('$')) return false

  // Content should have meaningful text characteristics
  const hasSpaces = val.includes(' ')
  const hasNewlines = val.includes('\n')
  const hasKorean = /[\u3131-\uD79D]/.test(val)
  const looksLikeCode = /[{}();=]/.test(val)

  return hasSpaces || hasNewlines || hasKorean || looksLikeCode
}

// Check if content at given index is part of a thinking/reasoning block
function isThinkingContent(arr: unknown[], contentIndex: number): boolean {
  // Look backwards for content_type field followed by "thinking" or "reasoning"
  for (let j = contentIndex - 1; j >= Math.max(0, contentIndex - CONTENT_TYPE_LOOKBEHIND_WINDOW); j--) {
    if (arr[j] === 'content_type') {
      // Check if the next value after content_type is a skip type
      const nextVal = arr[j + 1]
      if (j + 1 < arr.length && typeof nextVal === 'string') {
        if (SKIP_CONTENT_TYPES.has(nextVal)) {
          return true
        }
      }
    }
    // Also check for direct "thinking" marker near the content
    if (arr[j] === 'thinking' || arr[j] === 'reasoning') {
      // Verify this is a content_type context, not just a word
      for (let k = j - 1; k >= Math.max(0, j - 5); k--) {
        if (arr[k] === 'content_type') {
          return true
        }
      }
    }
  }
  return false
}

// Extract data from ChatGPT's React Router streaming format
function extractFromReactRouterData(html: string): ParseResult | null {
  try {
    // Find all streamController.enqueue calls and get the biggest one
    const matches = html.matchAll(/streamController\.enqueue\("((?:[^"\\]|\\.)*)"\)/g)
    let biggestData: string | null = null
    let biggestLen = 0

    for (const m of matches) {
      if (m[1].length > biggestLen) {
        biggestLen = m[1].length
        biggestData = m[1]
      }
    }

    if (!biggestData || biggestLen < MIN_REACT_ROUTER_DATA_LENGTH) {
      return null
    }

    // The data is a JSON-stringified string (double-encoded).
    // First parse: unescape the outer string (handles \", \\, \u003c, \n, etc.)
    // Second parse: parse the inner JSON array
    const unescaped = JSON.parse('"' + biggestData + '"')
    const arr = JSON.parse(unescaped)

    if (!Array.isArray(arr)) return null

    // Find title
    let title = 'ChatGPT Conversation'
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === 'title' && typeof arr[i + 1] === 'string' && arr[i + 1].length > 0) {
        title = arr[i + 1]
        break
      }
    }

    // First, find all role marker positions and build a map from index to role
    const roleIndexMap = new Map<number, 'user' | 'assistant'>()
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'user' || arr[i] === 'assistant') {
        roleIndexMap.set(i, arr[i] as 'user' | 'assistant')
      }
    }

    // Find thinking summaries (e.g., "8s 동안 생각함", "1m 12s 동안 생각함")
    const thinkingSummaries = new Map<number, string>()
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'reasoning_recap' && typeof arr[i + 1] === 'string') {
        const summary = arr[i + 1] as string
        // Find the next message content after this summary
        thinkingSummaries.set(i, summary)
      }
    }

    // Find code block markers (python keyword)
    // Code content typically appears shortly after the python marker
    const codeBlockIndices = new Set<number>()
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'python') {
        // Mark content indices shortly before this python marker as code
        // Code content is usually within 10 elements before the marker
        for (let j = i - 10; j <= i + 5; j++) {
          codeBlockIndices.add(j)
        }
      }
    }

    // Extract raw messages by finding Array(1) followed by content
    const rawMessages: Array<{
      index: number
      content: string
      detectedRole: 'user' | 'assistant' | null
      messageType: 'text' | 'code' | 'thinking'
      thinkingSummary?: string
    }> = []

    for (let i = 0; i < arr.length - 1; i++) {
      if (Array.isArray(arr[i]) && arr[i].length === 1) {
        const next = arr[i + 1]
        if (isValidMessageContent(next)) {
          // Skip thinking/reasoning content blocks (internal reasoning, not summaries)
          if (isThinkingContent(arr, i + 1)) {
            continue
          }

          // Find the role by looking for {"_49": <role_index>} pattern in preceding elements
          let role: 'user' | 'assistant' | null = null

          // Look backwards for an object with _49 field that references a role index
          for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
            const elem = arr[j]
            if (typeof elem === 'object' && elem !== null && !Array.isArray(elem)) {
              const obj = elem as Record<string, unknown>
              if ('_49' in obj && typeof obj._49 === 'number') {
                const referencedRole = roleIndexMap.get(obj._49)
                if (referencedRole) {
                  role = referencedRole
                  break
                }
              }
            }
          }

          // Fallback: find the most recent role marker before this content
          if (!role) {
            for (const [idx, r] of Array.from(roleIndexMap.entries()).sort((a, b) => b[0] - a[0])) {
              if (idx < i) {
                role = r
                break
              }
            }
          }

          // Determine message type
          let messageType: 'text' | 'code' | 'thinking' = 'text'
          let thinkingSummary: string | undefined

          // Check if this is a code block (by index marker or content analysis)
          if (codeBlockIndices.has(i) || codeBlockIndices.has(i + 1) || looksLikePythonCode(next)) {
            messageType = 'code'
          }

          // Check if there's a thinking summary before this message
          for (const [summaryIdx, summary] of thinkingSummaries) {
            // If summary is within 30 elements before this content
            if (summaryIdx < i && summaryIdx > i - 30) {
              thinkingSummary = summary
              break
            }
          }

          rawMessages.push({
            index: i + 1,
            content: next,
            detectedRole: role,
            messageType,
            thinkingSummary
          })
        }
      }
    }

    if (rawMessages.length === 0) return null

    // Assign roles based on detected role (no alternation fallback)
    // Messages without a detected role keep the last known role
    let lastRole: 'user' | 'assistant' = 'user' // default to user for first message
    const messages: ParsedMessage[] = rawMessages.map((m, idx) => {
      let role: 'user' | 'assistant'
      if (m.detectedRole) {
        role = m.detectedRole
        lastRole = role
      } else {
        // Keep the last known role instead of alternating
        role = lastRole
      }

      return {
        id: `msg-${idx}`,
        role,
        content: m.content,
        html: '', // HTML rendering is done client-side
        messageType: m.messageType,
        thinkingSummary: m.thinkingSummary
      }
    })

    return { title, sourceUrl: '', messages }
  } catch (e) {
    console.error('Failed to extract from React Router data:', e)
    return null
  }
}

export async function fetchAndParseChatGPT(url: string): Promise<ParseResult> {
  if (!isValidChatGPTShareUrl(url)) {
    throw new InvalidUrlError()
  }

  // Fetch HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new ConversationNotFoundError()
    }
    throw new Error(`Failed to fetch URL: ${response.status}`)
  }

  const html = await response.text()

  // Extract from React Router streaming data
  const streamResult = extractFromReactRouterData(html)
  if (streamResult && streamResult.messages.length > 0) {
    return {
      ...streamResult,
      sourceUrl: url
    }
  }

  // If extraction failed, try to get title from meta tags for better error message
  const dom = new JSDOM(html)
  const document = dom.window.document
  const ogTitle = document.querySelector('meta[property="og:title"]')
  const pageTitle = ogTitle?.getAttribute('content') || 'the conversation'

  throw new NoMessagesFoundError(`No messages found in ${pageTitle}. The page format may have changed.`)
}

export async function parseAndCreateShare(url: string): Promise<ShareOutput> {
  const parsed = await fetchAndParseChatGPT(url)

  const input: CreateShareInput = {
    title: parsed.title,
    sourceUrl: parsed.sourceUrl,
    messages: parsed.messages
  }

  return createShare(input)
}
