import { Share, IShare, IMessage } from '../models/Share.js'
import { generateShareId } from '../utils/id-generator.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitize.js'
import { LRUCache } from 'lru-cache'

const MAX_MESSAGES = 100
const MAX_CONTENT_LENGTH = 100000
const MAX_HTML_LENGTH = 500000

// LRU Cache configuration
// - max: maximum number of items to store
// - ttl: time-to-live in milliseconds (5 minutes)
// - allowStale: return stale items while revalidating in background
// Note: updateAgeOnGet is intentionally disabled to ensure cache entries
// expire after TTL, preventing indefinitely stale data for frequently accessed items
const shareCache = new LRUCache<string, ShareData>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: true,
})

// Batch viewCount updates to reduce DB writes
const viewCountBuffer = new Map<string, number>()
let flushTimer: NodeJS.Timeout | null = null

async function flushViewCountBufferInternal(): Promise<void> {
  const updates = Array.from(viewCountBuffer.entries())
  if (updates.length === 0) return

  try {
    // Batch update all viewCounts
    await Promise.all(
      updates.map(([shareId, count]) =>
        Share.updateOne({ shareId }, { $inc: { viewCount: count } })
      )
    )
    // Only clear buffer after successful update to preserve failed increments
    viewCountBuffer.clear()
  } catch (error) {
    console.error('Failed to flush viewCount updates:', error)
    // Buffer is NOT cleared on failure, so increments will be retried on next flush
  }
}

function scheduleViewCountFlush() {
  if (flushTimer) return

  flushTimer = setTimeout(async () => {
    flushTimer = null
    await flushViewCountBufferInternal()
  }, 5000) // Flush every 5 seconds
}

function incrementViewCount(shareId: string) {
  const current = viewCountBuffer.get(shareId) || 0
  viewCountBuffer.set(shareId, current + 1)
  scheduleViewCountFlush()
}

/**
 * Flush pending viewCount updates and clean up timers.
 * Call this during application shutdown for graceful cleanup.
 */
export async function shutdownShareService(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  await flushViewCountBufferInternal()
}

export interface CreateShareInput {
  title: string
  sourceUrl: string
  messages: IMessage[]
}

export interface ShareOutput {
  id: string
  url: string
  expiresAt: string | null
}

export interface ShareData {
  id: string
  title: string
  sourceUrl: string
  messages: IMessage[]
  createdAt: string
  viewCount: number
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'chatgpt.com'
  } catch {
    return false
  }
}

export async function createShare(input: CreateShareInput): Promise<ShareOutput> {
  if (!input.title || input.title.length > 500) {
    throw new Error('Invalid title')
  }

  if (!validateUrl(input.sourceUrl)) {
    throw new Error('Invalid source URL')
  }

  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new Error('No messages provided')
  }

  if (input.messages.length > MAX_MESSAGES) {
    throw new Error(`Too many messages (max ${MAX_MESSAGES})`)
  }

  const sanitizedMessages: IMessage[] = input.messages.map((msg, index) => {
    // id가 없으면 자동 생성
    const messageId = msg.id || `msg-${index}-${Date.now()}`

    if (!msg.role) {
      throw new Error(`Missing role at index ${index}`)
    }

    if (msg.role !== 'user' && msg.role !== 'assistant') {
      throw new Error(`Invalid role at index ${index}: ${msg.role}`)
    }

    // content가 없으면 빈 문자열 허용
    const content = msg.content || ''

    if (content.length > MAX_CONTENT_LENGTH) {
      throw new Error(`Message content too long at index ${index}`)
    }

    const html = msg.html || ''
    if (html.length > MAX_HTML_LENGTH) {
      throw new Error(`Message HTML too long at index ${index}`)
    }

    return {
      id: sanitizeText(messageId),
      role: msg.role as 'user' | 'assistant',
      content: content.trim(), // Keep raw content for client-side markdown rendering
      html: sanitizeHtml(html)
    }
  })

  const shareId = generateShareId()
  const shareBaseUrl = process.env.SHARE_BASE_URL || 'http://localhost:3000/s'

  const share = new Share({
    shareId,
    title: sanitizeText(input.title),
    sourceUrl: input.sourceUrl,
    messages: sanitizedMessages,
    expiresAt: null
  })

  await share.save()

  return {
    id: shareId,
    url: `${shareBaseUrl}/${shareId}`,
    expiresAt: null
  }
}

export async function getShare(shareId: string): Promise<ShareData | null> {
  // Check cache first
  const cached = shareCache.get(shareId)
  if (cached) {
    // Increment view count asynchronously (batched)
    incrementViewCount(shareId)
    // Include pending buffered viewCount for more accurate response
    const bufferedCount = viewCountBuffer.get(shareId) || 0
    if (bufferedCount > 0) {
      return { ...cached, viewCount: cached.viewCount + bufferedCount }
    }
    return cached
  }

  // Cache miss - fetch from database
  const share = await Share.findOne({ shareId }).lean()

  if (!share) {
    return null
  }

  const shareData: ShareData = {
    id: share.shareId,
    title: share.title,
    sourceUrl: share.sourceUrl,
    messages: share.messages,
    createdAt: share.createdAt.toISOString(),
    viewCount: share.viewCount
  }

  // Store in cache
  shareCache.set(shareId, shareData)

  // Increment view count asynchronously (batched)
  incrementViewCount(shareId)

  return shareData
}

export async function deleteShare(shareId: string): Promise<boolean> {
  // Invalidate cache entry to prevent serving deleted data
  shareCache.delete(shareId)
  // Remove any pending viewCount updates for deleted share
  viewCountBuffer.delete(shareId)

  const result = await Share.deleteOne({ shareId })
  return result.deletedCount > 0
}
