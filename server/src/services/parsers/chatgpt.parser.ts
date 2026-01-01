/**
 * ChatGPT Parser
 *
 * Handles parsing of ChatGPT shared conversations from:
 * - https://chatgpt.com/share/*
 * - https://chat.openai.com/share/*
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

// Constants for magic numbers
const MIN_REACT_ROUTER_DATA_LENGTH = 1000
const ROLE_LOOKBEHIND_WINDOW = 50

// The "_49" key in pointer objects typically points to the role index
const ROLE_POINTER_KEY = '_49'

// Constants for code detection heuristics
const CODE_RATIO_THRESHOLD = 0.7
const MAX_TEXT_LINES_FOR_CODE_RATIO = 2
const SHORT_CONTENT_THRESHOLD = 300

// Constants for reasoning content detection
const REASONING_CONTENT_LOOKAHEAD = 100
const MIN_REASONING_CONTENT_LENGTH = 20

// Constants for message deduplication
const DEDUPE_PREFIX_LENGTH = 200

// Constants for context lookbehind/lookahead in filtering functions
const CONTEXT_LOOKBEHIND = 50
const CONTEXT_LOOKAHEAD = 30

// Strong code indicator patterns
const STRONG_CODE_PATTERNS = [
  /^import\s+[a-z]/i,
  /^from\s+[a-z]/i,
  /^def\s+[a-z_]/i,
  /^class\s+[A-Z]/i,
  /^@[a-z]/i
]

const CHATGPT_URL_PATTERNS = [
  /^https:\/\/chatgpt\.com\/share\/[a-zA-Z0-9-]+$/,
  /^https:\/\/chat\.openai\.com\/share\/[a-zA-Z0-9-]+$/
]

// Keywords and patterns that indicate metadata
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
  'serverResponse', 'type', 'data', 'client-created-root', 'history_off_approved'
])

// Keywords that indicate reasoning/thinking content
const REASONING_KEYWORDS = new Set([
  'reasoning_title', 'reasoning_recap', 'reasoning_status', 'reasoning_ended',
  'thoughts', 'thinking', 'is_reasoning', 'thinking_effort', 'skip_reasoning_title',
  'finished_duration_sec', 'source_analysis_msg_id'
])

// Content types that should be filtered out
const FILTERED_CONTENT_TYPES = new Set([
  'execution_output', 'code', 'tether_browsing_display', 'tether_quote',
  'system_error', 'stderr', 'multimodal_text'
])

// Roles that should be filtered out
const FILTERED_ROLES = new Set(['tool', 'system'])

// Keywords that indicate code execution context
const CODE_EXECUTION_KEYWORDS = new Set([
  'python', 'code', 'execution_output', 'aggregate_result', 'run_id',
  'start_time', 'end_time', 'final_expression_output', 'in_kernel_exception',
  'system_exception', 'success', 'jupyter_messages', 'jupyter_message_type'
])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DOMAIN_LIST_PATTERN = /^[a-z0-9.-]+\.(com|org|net|edu|io|co|au)(,\s*[a-z0-9.-]+\.(com|org|net|edu|io|co|au))*$/i

function looksLikeStandaloneCode(content: string): boolean {
  const trimmed = content.trim()
  const lines = trimmed.split('\n')
  const firstLine = lines[0].trim()

  for (const pattern of STRONG_CODE_PATTERNS) {
    if (pattern.test(firstLine)) {
      return true
    }
  }

  let codeLineCount = 0
  let textLineCount = 0

  for (const line of lines) {
    const l = line.trim()
    if (l.length === 0) continue

    const isTextLine =
      (/^[A-Z][a-z]/.test(l) && l.includes(' ') && l.length > 30) ||
      /^[-*•]/.test(l) ||
      /^\*\*/.test(l) ||
      /^#{1,6}\s/.test(l) ||
      (/^\\?\[/.test(l) && l.includes('\\')) ||
      /^\\\(/.test(l) ||
      l.includes('\\frac') ||
      l.includes('\\text') ||
      /^\([a-z]\)\s/i.test(l) ||
      /^Problem\s+\d/i.test(l) ||
      /^Question\s+\d/i.test(l) ||
      /^\d+\.\s+[A-Z]/i.test(l) ||
      (/^for\s+[a-z]+\s+[a-z]+/i.test(l) && l.includes(' ') && !/\s+in\s+/.test(l))

    const isCodeLine =
      !isTextLine &&
      (/^[a-z_][a-z0-9_]*\s*=/i.test(l) ||
        /^[a-z_][a-z0-9_]*\s*\([^)]*\)\s*$/i.test(l) ||
        /^(while|elif|else|return|print|try|except|with)\s/i.test(l) ||
        /^for\s+[a-z_]+\s+in\s+/i.test(l) ||
        /^if\s+.+:/i.test(l) ||
        /^#[^#]/.test(l) ||
        /^\s*(def|class|import|from)\s/i.test(l) ||
        /^[a-z_][a-z0-9_]*\.[a-z]/i.test(l) ||
        /^\[\d/.test(l) ||
        /^\{['"]/i.test(l) ||
        (/^\([a-z_]/i.test(l) && !/^\([a-z]\)\s/i.test(l)))

    if (isTextLine) {
      textLineCount++
    } else if (isCodeLine) {
      codeLineCount++
    }
  }

  const totalClassified = codeLineCount + textLineCount
  if (totalClassified > 0) {
    const codeRatio = codeLineCount / totalClassified
    if (codeRatio > CODE_RATIO_THRESHOLD && textLineCount <= MAX_TEXT_LINES_FOR_CODE_RATIO) {
      return true
    }
  }

  if (trimmed.length < SHORT_CONTENT_THRESHOLD) {
    if (/^[\d\.e\-\+\*\/\(\)\s,\[\]]+$/i.test(trimmed)) {
      return true
    }
    if (/^[a-z_][a-z0-9_]*\s*=/.test(trimmed) && !trimmed.includes('\n\n')) {
      const hasNaturalText = lines.some((l) => /^[A-Z][a-z]/.test(l.trim()) && l.includes(' '))
      if (!hasNaturalText) {
        return true
      }
    }
  }

  return false
}

function isFilteredContent(arr: unknown[], index: number): boolean {
  for (let j = index - 1; j >= Math.max(0, index - CONTEXT_LOOKBEHIND); j--) {
    const val = arr[j]
    if (typeof val === 'string') {
      if (val === 'content_type' && typeof arr[j + 1] === 'string') {
        const contentType = arr[j + 1] as string
        if (FILTERED_CONTENT_TYPES.has(contentType)) {
          return true
        }
      }
      if (CODE_EXECUTION_KEYWORDS.has(val)) {
        return true
      }
      if (FILTERED_ROLES.has(val)) {
        return true
      }
    }
    if (val === 'user' || val === 'assistant') {
      break
    }
  }

  for (let j = index + 1; j < Math.min(arr.length, index + CONTEXT_LOOKAHEAD); j++) {
    const val = arr[j]
    if (typeof val === 'string') {
      if (CODE_EXECUTION_KEYWORDS.has(val)) {
        return true
      }
    }
    if (val === 'user' || val === 'assistant') {
      break
    }
  }

  return false
}

function isValidMessageContent(val: unknown): val is string {
  if (typeof val !== 'string') return false
  if (val.length < 2) return false

  if (METADATA_KEYWORDS.has(val) || METADATA_KEYWORDS.has(val.toLowerCase())) return false
  if (UUID_PATTERN.test(val)) return false
  if (/^\d+$/.test(val)) return false
  if (/^\d+\.\d+$/.test(val)) return false
  if (/^gpt-\d/.test(val)) return false
  if (/^[a-z0-9]{4,12}$/.test(val) && !/\s/.test(val)) return false
  if (/^[a-z0-9.-]+\.(com|org|net|edu|io|co|au)$/i.test(val)) return false
  if (DOMAIN_LIST_PATTERN.test(val)) return false
  if (val.startsWith('_') || val.startsWith('$')) return false

  const hasSpaces = val.includes(' ')
  const hasNewlines = val.includes('\n')
  const hasKorean = /[\u3131-\uD79D]/.test(val)
  const looksLikeCode = /[{}();=]/.test(val)

  return hasSpaces || hasNewlines || hasKorean || looksLikeCode
}

function extractFromReactRouterDataStructured(html: string): Omit<ParseResult, 'platform'> | null {
  try {
    const enqueueMatches = html.matchAll(/streamController\.enqueue\("((?:[^"\\]|\\.)*)"\)/g)

    const candidates: unknown[][] = []
    for (const m of enqueueMatches) {
      const raw = m[1]
      try {
        const unescaped = JSON.parse('"' + raw + '"')
        const parsed = JSON.parse(unescaped)
        if (Array.isArray(parsed) && parsed.includes('serverResponse')) {
          candidates.push(parsed)
        }
      } catch {
        // Ignore non-JSON chunks
      }
    }

    if (candidates.length === 0) return null

    const heap = candidates.reduce((best, cur) => (cur.length > best.length ? cur : best), candidates[0])

    const serverResponseIndex = heap.indexOf('serverResponse')
    if (serverResponseIndex === -1) return null

    const serverResponsePtr = heap[serverResponseIndex + 1]
    if (!serverResponsePtr || typeof serverResponsePtr !== 'object' || Array.isArray(serverResponsePtr)) {
      return null
    }

    const cache = new Map<number, unknown>()

    function decodeIndex(idx: number): unknown {
      if (cache.has(idx)) return cache.get(idx)
      cache.set(idx, null)
      const v = heap[idx]
      const decoded = decodeValue(v)
      cache.set(idx, decoded)
      return decoded
    }

    function decodeValue(v: unknown): unknown {
      if (Array.isArray(v)) {
        return v.map((item) => (typeof item === 'number' ? decodeIndex(item) : decodeValue(item)))
      }

      if (v && typeof v === 'object') {
        const entries = Object.entries(v as Record<string, unknown>)
        const hasPointerKeys = entries.some(([k]) => k.startsWith('_'))

        if (!hasPointerKeys) return v

        const out: Record<string, unknown> = {}
        for (const [k, childIdx] of entries) {
          if (!k.startsWith('_')) continue
          if (typeof childIdx !== 'number') continue

          const propNameIdx = Number(k.slice(1))
          if (!Number.isInteger(propNameIdx) || propNameIdx < 0 || propNameIdx >= heap.length) continue

          const propName = heap[propNameIdx]
          if (typeof propName !== 'string') continue

          out[propName] = decodeIndex(childIdx)
        }
        return out
      }

      return v
    }

    const serverResponse = decodeValue(serverResponsePtr)
    if (!serverResponse || typeof serverResponse !== 'object' || Array.isArray(serverResponse)) return null

    const sr = serverResponse as Record<string, unknown>
    const data = sr['data']
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null

    const conversation = data as Record<string, unknown>
    const mappingVal = conversation['mapping']
    if (!mappingVal || typeof mappingVal !== 'object' || Array.isArray(mappingVal)) return null

    const mapping = mappingVal as Record<string, unknown>
    const currentNode = typeof conversation['current_node'] === 'string' ? conversation['current_node'] : null

    const title =
      typeof conversation['title'] === 'string' && conversation['title'].length > 0
        ? conversation['title']
        : 'ChatGPT Conversation'

    const nodePath: string[] = []
    const seen = new Set<string>()

    function getNode(id: string): Record<string, unknown> | null {
      const n = mapping[id]
      if (!n || typeof n !== 'object' || Array.isArray(n)) return null
      return n as Record<string, unknown>
    }

    if (currentNode && getNode(currentNode)) {
      let cursor: string | null = currentNode
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor)
        nodePath.push(cursor)

        const node = getNode(cursor)
        const parent = node && typeof node['parent'] === 'string' ? node['parent'] : null
        cursor = parent
      }
      nodePath.reverse()
    } else {
      let cursor: string | null = 'client-created-root'
      for (let i = 0; i < 10000 && cursor; i++) {
        if (seen.has(cursor)) break
        seen.add(cursor)
        nodePath.push(cursor)

        const node = getNode(cursor)
        const children = node && Array.isArray(node['children']) ? node['children'] : null
        const lastChild = children?.length ? children[children.length - 1] : null
        cursor = typeof lastChild === 'string' ? lastChild : null
      }
    }

    if (nodePath.length === 0) return null

    const messages: ParsedMessage[] = []

    for (const nodeId of nodePath) {
      const node = getNode(nodeId)
      if (!node) continue

      const messageVal = node['message']
      if (!messageVal || typeof messageVal !== 'object' || Array.isArray(messageVal)) continue
      const message = messageVal as Record<string, unknown>

      const authorVal = message['author']
      if (!authorVal || typeof authorVal !== 'object' || Array.isArray(authorVal)) continue
      const author = authorVal as Record<string, unknown>

      const role = author['role']
      if (role !== 'user' && role !== 'assistant') continue

      const contentVal = message['content']
      if (!contentVal || typeof contentVal !== 'object' || Array.isArray(contentVal)) continue
      const content = contentVal as Record<string, unknown>

      const contentType = content['content_type']
      if (contentType !== 'text') continue

      const partsVal = content['parts']
      const parts = Array.isArray(partsVal) ? partsVal : []
      const text = parts.filter((p): p is string => typeof p === 'string').join('')

      if (text.trim().length === 0) continue

      messages.push({
        id: typeof message['id'] === 'string' ? message['id'] : nodeId,
        role,
        content: text,
        html: ''
      })
    }

    if (messages.length === 0) return null

    return { title, sourceUrl: '', messages }
  } catch (e) {
    console.error('Failed to extract from React Router structured data:', e)
    return null
  }
}

function extractFromReactRouterDataHeuristic(html: string): Omit<ParseResult, 'platform'> | null {
  try {
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

    const unescaped = JSON.parse('"' + biggestData + '"')
    const arr = JSON.parse(unescaped)

    if (!Array.isArray(arr)) return null

    let title = 'ChatGPT Conversation'
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === 'title' && typeof arr[i + 1] === 'string' && arr[i + 1].length > 0) {
        title = arr[i + 1]
        break
      }
    }

    const reasoningIndices = new Set<number>()
    for (let i = 0; i < arr.length - 1; i++) {
      if (typeof arr[i] === 'string' && REASONING_KEYWORDS.has(arr[i])) {
        for (let j = i + 1; j < Math.min(arr.length, i + REASONING_CONTENT_LOOKAHEAD); j++) {
          if (typeof arr[j] === 'string' && arr[j].length > MIN_REASONING_CONTENT_LENGTH) {
            reasoningIndices.add(j)
          }
          if (arr[j] === 'user' || arr[j] === 'assistant') break
        }
      }
    }

    const roleIndexMap = new Map<number, 'user' | 'assistant'>()
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'user' || arr[i] === 'assistant') {
        roleIndexMap.set(i, arr[i] as 'user' | 'assistant')
      }
    }

    function detectRoleForContent(arr: unknown[], arrayIndex: number): 'user' | 'assistant' | null {
      for (let j = arrayIndex - 1; j >= Math.max(0, arrayIndex - ROLE_LOOKBEHIND_WINDOW); j--) {
        const val = arr[j]

        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const obj = val as Record<string, unknown>
          if (ROLE_POINTER_KEY in obj && typeof obj[ROLE_POINTER_KEY] === 'number') {
            const pointerIdx = obj[ROLE_POINTER_KEY]
            const role = roleIndexMap.get(pointerIdx)
            if (role) {
              return role
            }
          }
        }

        if (val === 'user' || val === 'assistant') {
          return val as 'user' | 'assistant'
        }
      }

      return null
    }

    const rawMessages: Array<{ index: number; content: string; detectedRole: 'user' | 'assistant' | null }> = []

    for (let i = 0; i < arr.length - 1; i++) {
      if (Array.isArray(arr[i]) && arr[i].length === 1) {
        const next = arr[i + 1]
        if (isValidMessageContent(next)) {
          const contentIndex = i + 1

          if (reasoningIndices.has(contentIndex)) continue
          if (isFilteredContent(arr, contentIndex)) continue
          if (looksLikeStandaloneCode(next)) continue

          const role = detectRoleForContent(arr, i)

          rawMessages.push({
            index: contentIndex,
            content: next,
            detectedRole: role
          })
        }
      }
    }

    if (rawMessages.length === 0) return null

    const seenContent = new Set<string>()
    const uniqueMessages = rawMessages.filter((m) => {
      const contentKey = m.content.substring(0, DEDUPE_PREFIX_LENGTH)
      if (seenContent.has(contentKey)) return false
      seenContent.add(contentKey)
      return true
    })

    let lastRole: 'user' | 'assistant' | null = null
    const messages: ParsedMessage[] = uniqueMessages.map((m, idx) => {
      let role: 'user' | 'assistant'
      if (m.detectedRole) {
        role = m.detectedRole
      } else {
        role = lastRole === 'user' ? 'assistant' : 'user'
      }
      lastRole = role

      return {
        id: `msg-${idx}`,
        role,
        content: m.content,
        html: ''
      }
    })

    return { title, sourceUrl: '', messages }
  } catch (e) {
    console.error('Failed to extract from React Router data:', e)
    return null
  }
}

function extractFromReactRouterData(html: string): Omit<ParseResult, 'platform'> | null {
  const structured = extractFromReactRouterDataStructured(html)
  if (structured && structured.messages.length > 0) return structured

  return extractFromReactRouterDataHeuristic(html)
}

export class ChatGPTParser implements IChatParser {
  readonly platform = 'chatgpt' as const

  canParse(url: string): boolean {
    return CHATGPT_URL_PATTERNS.some((pattern) => pattern.test(url))
  }

  getSupportedPatterns(): string[] {
    return ['https://chatgpt.com/share/*', 'https://chat.openai.com/share/*']
  }

  async parse(url: string): Promise<ParseResult> {
    if (!this.canParse(url)) {
      throw new InvalidUrlError('Invalid ChatGPT share URL')
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
        throw new ConversationNotFoundError('ChatGPT conversation not found')
      }
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()

    const streamResult = extractFromReactRouterData(html)
    if (streamResult && streamResult.messages.length > 0) {
      return {
        ...streamResult,
        sourceUrl: url,
        platform: this.platform
      }
    }

    const dom = new JSDOM(html)
    const document = dom.window.document
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const pageTitle = ogTitle?.getAttribute('content') || 'the conversation'

    throw new NoMessagesFoundError(`No messages found in ${pageTitle}. The page format may have changed.`)
  }
}
