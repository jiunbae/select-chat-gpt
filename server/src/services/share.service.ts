import { Share, IShare, IMessage } from '../models/Share.js'
import { generateShareId } from '../utils/id-generator.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitize.js'
import * as cache from './cache.service.js'

const MAX_MESSAGES = 100
const MAX_CONTENT_LENGTH = 100000
const MAX_HTML_LENGTH = 500000
const CACHE_TTL = 300 // 5 minutes in seconds
const CACHE_PREFIX = 'share:'

// Batch viewCount updates to reduce DB writes
// Max buffer size prevents unbounded memory growth during DB outages
const MAX_BUFFER_SIZE = 10000
const viewCountBuffer = new Map<string, number>()
let flushTimer: NodeJS.Timeout | null = null
let consecutiveFlushFailures = 0
const MAX_CONSECUTIVE_FAILURES = 5

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
    consecutiveFlushFailures = 0
  } catch (error) {
    consecutiveFlushFailures++
    console.error(`Failed to flush viewCount updates (attempt ${consecutiveFlushFailures}):`, error)

    // If too many consecutive failures, clear buffer to prevent memory issues
    // and log warning about lost view counts
    if (consecutiveFlushFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`Clearing viewCount buffer after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. ${viewCountBuffer.size} entries lost.`)
      viewCountBuffer.clear()
      consecutiveFlushFailures = 0
    }
    // Otherwise, buffer is NOT cleared on failure, so increments will be retried on next flush
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
  // Check buffer size limit to prevent unbounded memory growth
  if (viewCountBuffer.size >= MAX_BUFFER_SIZE && !viewCountBuffer.has(shareId)) {
    console.warn(`ViewCount buffer at max size (${MAX_BUFFER_SIZE}), forcing flush`)
    flushViewCountBufferInternal() // Fire and forget
  }

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
  const cacheKey = `${CACHE_PREFIX}${shareId}`

  // Check Redis cache first
  const cached = await cache.get<ShareData>(cacheKey)
  if (cached) {
    // Increment view count asynchronously (batched)
    incrementViewCount(shareId)
    // Include pending buffered viewCount for more accurate response
    // Note: There's a minor race condition where flush could occur between
    // reading bufferedCount and returning. This is acceptable as viewCount
    // accuracy is not critical for this use case.
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

  // Increment view count asynchronously (batched)
  // Note: We increment BEFORE creating shareData so the returned viewCount
  // reflects this view (viewCount + 1), ensuring consistency between
  // cache miss and subsequent cache hits
  incrementViewCount(shareId)

  const shareData: ShareData = {
    id: share.shareId,
    title: share.title,
    sourceUrl: share.sourceUrl,
    messages: share.messages,
    createdAt: share.createdAt.toISOString(),
    viewCount: share.viewCount + 1  // Include current view in count
  }

  // Store in Redis cache with TTL
  await cache.set(cacheKey, shareData, CACHE_TTL)

  return shareData
}

export async function deleteShare(shareId: string): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX}${shareId}`

  // Invalidate Redis cache entry to prevent serving deleted data
  await cache.del(cacheKey)
  // Remove any pending viewCount updates for deleted share
  // Note: If a flush is in progress, already-queued updates may still be
  // applied to DB (MongoDB will update 0 documents). This is acceptable
  // as it has no functional impact.
  viewCountBuffer.delete(shareId)

  const result = await Share.deleteOne({ shareId })
  return result.deletedCount > 0
}
