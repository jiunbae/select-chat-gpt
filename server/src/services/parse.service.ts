import { JSDOM } from 'jsdom'
import { createShare, CreateShareInput, ShareOutput } from './share.service.js'
import { parseSuccessTotal, parseFailureTotal, parseFallbackUsed } from '../metrics.js'

// Parse strategy enum for tracking which method succeeded
export enum ParseStrategy {
  STRUCTURED = 'structured',    // Full structured extraction with pointer decoding
  HEURISTIC = 'heuristic',      // Pattern-based heuristic extraction
  MANUAL = 'manual',            // Manual fallback with relaxed rules
  FAILED = 'failed'             // All strategies failed
}

// Extended parse result with strategy info
export interface ExtendedParseResult {
  result: ParseResult | null
  strategy: ParseStrategy
  attemptedStrategies: ParseStrategy[]
  errors: Map<ParseStrategy, string>
}

export interface ParsedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  html: string
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
const ROLE_LOOKBEHIND_WINDOW = 50  // Increased from 30 for better role detection

// Default title for conversations when title is not found
const DEFAULT_CONVERSATION_TITLE = 'ChatGPT Conversation'

// The "_49" key in pointer objects typically points to the role index
// These are stored as actual JavaScript objects in the parsed array, not strings
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
const REASONING_LOOKBEHIND = 50
const CONTEXT_LOOKBEHIND = 50
const CONTEXT_LOOKAHEAD = 30

// Strong code indicator patterns - if first line matches, it's definitely code
const STRONG_CODE_PATTERNS = [
  /^import\s+[a-z]/i,           // import statements
  /^from\s+[a-z]/i,             // from ... import
  /^def\s+[a-z_]/i,             // function definitions
  /^class\s+[A-Z]/i,            // class definitions
  /^@[a-z]/i,                   // decorators
]

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
  'serverResponse', 'type', 'data', 'client-created-root', 'history_off_approved'
])

// Keywords that indicate reasoning/thinking content (should be filtered out)
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

// Roles that should be filtered out (not user/assistant conversation)
const FILTERED_ROLES = new Set([
  'tool', 'system'
])

// Keywords that indicate code execution context
const CODE_EXECUTION_KEYWORDS = new Set([
  'python', 'code', 'execution_output', 'aggregate_result', 'run_id',
  'start_time', 'end_time', 'final_expression_output', 'in_kernel_exception',
  'system_exception', 'success', 'jupyter_messages', 'jupyter_message_type'
])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DOMAIN_LIST_PATTERN = /^[a-z0-9.-]+\.(com|org|net|edu|io|co|au)(,\s*[a-z0-9.-]+\.(com|org|net|edu|io|co|au))*$/i

// Check if content looks like standalone code (not embedded in explanation)
function looksLikeStandaloneCode(content: string): boolean {
  const trimmed = content.trim()
  const lines = trimmed.split('\n')
  const firstLine = lines[0].trim()

  // Check strong code indicators first (early exit)
  for (const pattern of STRONG_CODE_PATTERNS) {
    if (pattern.test(firstLine)) {
      return true
    }
  }

  // Check if mostly code lines
  let codeLineCount = 0
  let textLineCount = 0

  for (const line of lines) {
    const l = line.trim()
    if (l.length === 0) continue

    // Text-like patterns (natural language) - check first to avoid false positives
    const isTextLine = (
      (/^[A-Z][a-z]/.test(l) && l.includes(' ') && l.length > 30) ||  // Sentence starting with capital letter
      /^[-*•]/.test(l) ||                                              // Bullet points
      /^\*\*/.test(l) ||                                               // Markdown bold
      /^#{1,6}\s/.test(l) ||                                           // Markdown headings
      (/^\\?\[/.test(l) && l.includes('\\')) ||                        // LaTeX brackets
      /^\\\(/.test(l) ||                                               // LaTeX inline math
      l.includes('\\frac') || l.includes('\\text') ||                  // LaTeX commands
      /^\([a-z]\)\s/i.test(l) ||                                       // Problem labels like (a), (b)
      /^Problem\s+\d/i.test(l) ||                                      // "Problem 1" etc.
      /^Question\s+\d/i.test(l) ||                                     // "Question 1" etc.
      /^\d+\.\s+[A-Z]/i.test(l) ||                                     // Numbered lists "1. Something"
      // English "for any..." vs Python "for x in y" - exclude if contains " in " pattern
      (/^for\s+[a-z]+\s+[a-z]+/i.test(l) && l.includes(' ') && !/\s+in\s+/.test(l))
    )

    // Code-like patterns - only if not already classified as text
    const isCodeLine = !isTextLine && (
      /^[a-z_][a-z0-9_]*\s*=/i.test(l) ||                              // Variable assignment
      /^[a-z_][a-z0-9_]*\s*\([^)]*\)\s*$/i.test(l) ||                  // Function call ending with )
      /^(while|elif|else|return|print|try|except|with)\s/i.test(l) ||  // Python keywords
      /^for\s+[a-z_]+\s+in\s+/i.test(l) ||                             // Python for loop "for x in y"
      /^if\s+.+:/i.test(l) ||                                            // General Python if statement
      /^#[^#]/.test(l) ||                                               // Python comment (not markdown heading)
      /^\s*(def|class|import|from)\s/i.test(l) ||                       // Python definitions/imports
      /^[a-z_][a-z0-9_]*\.[a-z]/i.test(l) ||                           // Method calls like np.mean
      /^\[\d/.test(l) ||                                                // List starting with number
      /^\{['"]/i.test(l) ||                                             // Dict with string key
      (/^\([a-z_]/i.test(l) && !/^\([a-z]\)\s/i.test(l))               // Tuple (not problem label)
    )

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

  // Short content that looks like code output or expression
  if (trimmed.length < SHORT_CONTENT_THRESHOLD) {
    if (/^[\d\.e\-\+\*\/\(\)\s,\[\]]+$/i.test(trimmed)) {
      return true
    }
    if (/^[a-z_][a-z0-9_]*\s*=/.test(trimmed) && !trimmed.includes('\n\n')) {
      const hasNaturalText = lines.some(l => /^[A-Z][a-z]/.test(l.trim()) && l.includes(' '))
      if (!hasNaturalText) {
        return true
      }
    }
  }

  return false
}

// Check if content at index is from a filtered role or content type
// Uses early exit pattern for better performance
function isFilteredContent(arr: unknown[], index: number): boolean {
  // Look backwards for context
  for (let j = index - 1; j >= Math.max(0, index - CONTEXT_LOOKBEHIND); j--) {
    const val = arr[j]
    if (typeof val === 'string') {
      // Check for filtered content_type (early exit)
      // Note: Type assertion required because TS doesn't narrow array element types after typeof check
      if (val === 'content_type' && typeof arr[j + 1] === 'string') {
        const contentType = arr[j + 1] as string
        if (FILTERED_CONTENT_TYPES.has(contentType)) {
          return true
        }
      }
      // Check for code execution keywords (early exit)
      if (CODE_EXECUTION_KEYWORDS.has(val)) {
        return true
      }
      // Check for filtered roles (early exit)
      if (FILTERED_ROLES.has(val)) {
        return true
      }
    }
    // Stop at role boundary
    if (val === 'user' || val === 'assistant') {
      break
    }
  }

  // Look forwards for code execution context
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

// Extract data from ChatGPT's React Router streaming format
function extractFromReactRouterDataStructured(html: string): ParseResult | null {
  try {
    // Parse any `streamController.enqueue("...")` chunks that decode into a JSON array.
    // ChatGPT uses React Router streaming data with a compact "heap" array that references
    // values by index. We decode the heap and then reconstruct the linear conversation
    // path using `current_node` and `parent` pointers.
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
        // Ignore non-JSON chunks (e.g., "P20:...") and malformed chunks
      }
    }

    if (candidates.length === 0) return null

    // Prefer the largest heap since it contains the full mapping for long conversations
    const heap = candidates.reduce((best, cur) => cur.length > best.length ? cur : best, candidates[0])

    const serverResponseIndex = heap.indexOf('serverResponse')
    if (serverResponseIndex === -1) return null

    const serverResponsePtr = heap[serverResponseIndex + 1]
    if (!serverResponsePtr || typeof serverResponsePtr !== 'object' || Array.isArray(serverResponsePtr)) {
      return null
    }

    const cache = new Map<number, unknown>()

    function decodeIndex(idx: number): unknown {
      if (cache.has(idx)) return cache.get(idx)

      // Placeholder helps prevent infinite recursion if the structure is cyclic
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

        // If it's not a pointer object, return as-is to avoid dropping data.
        // (We only rely on decoding for the pointer-encoded parts.)
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

    const title = typeof conversation['title'] === 'string' && conversation['title'].length > 0
      ? conversation['title']
      : DEFAULT_CONVERSATION_TITLE

    // Build the selected conversation path:
    // - Prefer `current_node` when available (handles edits/branches)
    // - Fallback to walking from root via the last child
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
      // Fallback: start from root if present
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

      // Skip empty messages (but keep whitespace inside messages)
      if (text.trim().length === 0) continue

      messages.push({
        id: typeof message['id'] === 'string' ? message['id'] : nodeId,
        role,
        content: text,
        html: '' // HTML rendering is done client-side
      })
    }

    if (messages.length === 0) return null

    return { title, sourceUrl: '', messages }
  } catch (e) {
    console.error('Failed to extract from React Router structured data:', e)
    return null
  }
}

// Extract data from ChatGPT's React Router streaming format (heuristic fallback)
function extractFromReactRouterDataHeuristic(html: string): ParseResult | null {
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
    let title = DEFAULT_CONVERSATION_TITLE
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === 'title' && typeof arr[i + 1] === 'string' && arr[i + 1].length > 0) {
        title = arr[i + 1]
        break
      }
    }

    // Pre-compute reasoning indices for direct exclusion
    // Check all REASONING_KEYWORDS to ensure comprehensive filtering
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

    // Build a map of role indices: index -> 'user' | 'assistant'
    // ChatGPT data stores roles at specific indices, and pointers reference these indices
    const roleIndexMap = new Map<number, 'user' | 'assistant'>()
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'user' || arr[i] === 'assistant') {
        roleIndexMap.set(i, arr[i] as 'user' | 'assistant')
      }
    }

    // Helper function to detect role from pointer object or direct keyword
    function detectRoleForContent(arr: unknown[], arrayIndex: number): 'user' | 'assistant' | null {
      for (let j = arrayIndex - 1; j >= Math.max(0, arrayIndex - ROLE_LOOKBEHIND_WINDOW); j--) {
        const val = arr[j]

        // Strategy 1: Look for pointer objects {"_49":IDX,...} that reference role indices
        // These are actual JavaScript objects, not strings
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

        // Strategy 2: Direct role keyword (fallback for simpler data structures)
        if (val === 'user' || val === 'assistant') {
          return val as 'user' | 'assistant'
        }
      }

      return null
    }

    // Extract raw messages by finding Array(1) followed by content
    const rawMessages: Array<{ index: number; content: string; detectedRole: 'user' | 'assistant' | null }> = []

    for (let i = 0; i < arr.length - 1; i++) {
      if (Array.isArray(arr[i]) && arr[i].length === 1) {
        const next = arr[i + 1]
        if (isValidMessageContent(next)) {
          const contentIndex = i + 1

          // Skip reasoning content (pre-computed using all REASONING_KEYWORDS)
          if (reasoningIndices.has(contentIndex)) continue

          // Skip filtered content (tool outputs, code execution, etc.)
          if (isFilteredContent(arr, contentIndex)) continue

          // Skip standalone code blocks
          if (looksLikeStandaloneCode(next)) continue

          // Detect role using pointer-based or direct keyword detection
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

    // Deduplicate messages based on content prefix
    const seenContent = new Set<string>()
    const uniqueMessages = rawMessages.filter(m => {
      const contentKey = m.content.substring(0, DEDUPE_PREFIX_LENGTH)
      if (seenContent.has(contentKey)) return false
      seenContent.add(contentKey)
      return true
    })

    // Assign roles (use detected role when available, otherwise alternate)
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
        html: '' // HTML rendering is done client-side
      }
    })

    return { title, sourceUrl: '', messages }
  } catch (e) {
    console.error('Failed to extract from React Router data:', e)
    return null
  }
}

function extractFromReactRouterData(html: string): ParseResult | null {
  // Prefer structured extraction for accuracy (especially in long conversations),
  // then fall back to the older heuristic extraction.
  const structured = extractFromReactRouterDataStructured(html)
  if (structured && structured.messages.length > 0) return structured

  return extractFromReactRouterDataHeuristic(html)
}

// Manual fallback extraction - most relaxed rules for edge cases
// This attempts to extract any text content that looks like conversation
function extractWithManualFallback(html: string): ParseResult | null {
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Try to find title from meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const title = ogTitle?.getAttribute('content') || DEFAULT_CONVERSATION_TITLE

    // Strategy 1: Look for data in script tags with JSON-like content
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
      const content = script.textContent || ''

      // Look for conversation-like patterns in script content
      const conversationMatch = content.match(/"parts"\s*:\s*\[\s*"([^"]+)"/g)
      if (conversationMatch && conversationMatch.length > 0) {
        const messages: ParsedMessage[] = []
        let role: 'user' | 'assistant' = 'user'

        for (const match of conversationMatch) {
          const textMatch = match.match(/"parts"\s*:\s*\[\s*"([^"]+)"/)
          if (textMatch && textMatch[1]) {
            // Use JSON.parse for robust escape sequence handling (handles \n, \", \\, \t, \uXXXX, etc.)
            let text: string
            try {
              text = JSON.parse(`"${textMatch[1]}"`)
            } catch {
              // Fallback to raw text if JSON parsing fails
              text = textMatch[1]
            }

            if (text.trim().length > 0 && !METADATA_KEYWORDS.has(text.toLowerCase())) {
              messages.push({
                id: `manual-${messages.length}`,
                role,
                content: text,
                html: ''
              })
              role = role === 'user' ? 'assistant' : 'user'
            }
          }
        }

        if (messages.length > 0) {
          return { title, sourceUrl: '', messages }
        }
      }
    }

    // Strategy 2: Look for Next.js/React hydration data
    const nextDataScript = document.querySelector('#__NEXT_DATA__')
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript.textContent || '{}')
        const props = nextData?.props?.pageProps
        if (props?.serverResponse?.data?.mapping) {
          // Use structured extraction logic on this data
          const mapping = props.serverResponse.data.mapping
          const messages: ParsedMessage[] = []

          for (const [nodeId, node] of Object.entries(mapping)) {
            const n = node as Record<string, unknown>
            const msg = n?.message as Record<string, unknown>
            if (!msg) continue

            const author = msg?.author as Record<string, unknown>
            const role = author?.role
            if (role !== 'user' && role !== 'assistant') continue

            const content = msg?.content as Record<string, unknown>
            if (content?.content_type !== 'text') continue

            const parts = content?.parts as unknown[]
            const text = Array.isArray(parts)
              ? parts.filter((p): p is string => typeof p === 'string').join('')
              : ''

            if (text.trim().length > 0) {
              messages.push({
                id: typeof msg.id === 'string' ? msg.id : nodeId,
                role: role as 'user' | 'assistant',
                content: text,
                html: ''
              })
            }
          }

          if (messages.length > 0) {
            return {
              title: props.serverResponse.data.title || title,
              sourceUrl: '',
              messages
            }
          }
        }
      } catch (e) {
        console.error('Manual fallback (Next.js data) failed:', e)
        // Continue to next strategy
      }
    }

    // Strategy 3: Look for visible conversation text in DOM
    const articleElements = document.querySelectorAll('article, [data-message-author-role]')
    if (articleElements.length > 0) {
      const messages: ParsedMessage[] = []

      for (const el of articleElements) {
        const roleAttr = el.getAttribute('data-message-author-role')
        const role: 'user' | 'assistant' = roleAttr === 'assistant' ? 'assistant' : 'user'
        const text = el.textContent?.trim() || ''

        if (text.length > 0) {
          messages.push({
            id: `dom-${messages.length}`,
            role,
            content: text,
            html: ''
          })
        }
      }

      if (messages.length > 0) {
        return { title, sourceUrl: '', messages }
      }
    }

    return null
  } catch (e) {
    console.error('Manual fallback extraction failed:', e)
    return null
  }
}

// Strategy configuration for the fallback chain
interface StrategyConfig {
  name: ParseStrategy
  extractor: (html: string) => ParseResult | null
  errorMessage: string
}

// Multi-strategy extraction with fallback chain
// Tries: structured -> heuristic -> manual, tracking which strategy succeeded
export function extractMessagesWithFallback(html: string): ExtendedParseResult {
  const strategies: StrategyConfig[] = [
    {
      name: ParseStrategy.STRUCTURED,
      extractor: extractFromReactRouterDataStructured,
      errorMessage: 'No messages extracted from structured data',
    },
    {
      name: ParseStrategy.HEURISTIC,
      extractor: extractFromReactRouterDataHeuristic,
      errorMessage: 'No messages extracted from heuristic patterns',
    },
    {
      name: ParseStrategy.MANUAL,
      extractor: extractWithManualFallback,
      errorMessage: 'No messages extracted with manual fallback',
    },
  ]

  const attemptedStrategies: ParseStrategy[] = []
  const errors = new Map<ParseStrategy, string>()

  for (const { name, extractor, errorMessage } of strategies) {
    attemptedStrategies.push(name)
    try {
      const result = extractor(html)
      if (result && result.messages.length > 0) {
        return {
          result,
          strategy: name,
          attemptedStrategies,
          errors,
        }
      }
      errors.set(name, errorMessage)
    } catch (e) {
      errors.set(name, e instanceof Error ? e.message : 'Unknown error')
    }
  }

  // All strategies failed
  return {
    result: null,
    strategy: ParseStrategy.FAILED,
    attemptedStrategies,
    errors,
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

  // Use multi-strategy extraction with fallback chain
  const extractResult = extractMessagesWithFallback(html)

  if (extractResult.result && extractResult.result.messages.length > 0) {
    // Record success metrics
    parseSuccessTotal.inc()

    // Record fallback usage if not using primary strategy
    if (extractResult.strategy !== ParseStrategy.STRUCTURED) {
      parseFallbackUsed.inc({ strategy: extractResult.strategy })
      console.log(`Parse succeeded with fallback strategy: ${extractResult.strategy}`)
    }

    return {
      ...extractResult.result,
      sourceUrl: url
    }
  }

  // All strategies failed - record failure metrics
  parseFailureTotal.inc()

  // Build detailed error message
  const errorDetails = Array.from(extractResult.errors.entries())
    .map(([strategy, error]) => `${strategy}: ${error}`)
    .join('; ')

  console.error(`All parse strategies failed for ${url}:`, errorDetails)

  // Try to get title from meta tags for better error message
  const dom = new JSDOM(html)
  const document = dom.window.document
  const ogTitle = document.querySelector('meta[property="og:title"]')
  const pageTitle = ogTitle?.getAttribute('content') || 'the conversation'

  throw new NoMessagesFoundError(
    `No messages found in ${pageTitle}. ` +
    `Tried ${extractResult.attemptedStrategies.length} extraction strategies. ` +
    `The page format may have changed or the conversation may be empty.`
  )
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
