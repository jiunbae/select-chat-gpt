import { Share, IShare, IMessage } from '../models/Share.js'
import { generateShareId } from '../utils/id-generator.js'
import { sanitizeHtml, sanitizeText } from '../utils/sanitize.js'

const MAX_MESSAGES = 100
const MAX_CONTENT_LENGTH = 100000
const MAX_HTML_LENGTH = 500000

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
      content: sanitizeText(content),
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
  const share = await Share.findOneAndUpdate(
    { shareId },
    { $inc: { viewCount: 1 } },
    { new: true }
  )

  if (!share) {
    return null
  }

  return {
    id: share.shareId,
    title: share.title,
    sourceUrl: share.sourceUrl,
    messages: share.messages,
    createdAt: share.createdAt.toISOString(),
    viewCount: share.viewCount
  }
}

export async function deleteShare(shareId: string): Promise<boolean> {
  const result = await Share.deleteOne({ shareId })
  return result.deletedCount > 0
}
