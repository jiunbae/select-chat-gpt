import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import {
  parseAndCreateShare,
  isValidShareUrl,
  getSupportedPatterns,
  ConversationNotFoundError,
  NoMessagesFoundError,
  InvalidUrlError,
  UnsupportedPlatformError
} from '../services/parse.service.js'
import { parseOperations } from '../metrics.js'

const router: RouterType = Router()

// Helper to get user-friendly error message for unsupported URLs
function getUnsupportedUrlMessage(): string {
  const patterns = getSupportedPatterns()
  return `Unsupported URL. Supported platforms: ${patterns.join(', ')}`
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { url } = req.body

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'URL is required'
      })
      return
    }

    const trimmedUrl = url.trim()

    if (!isValidShareUrl(trimmedUrl)) {
      res.status(400).json({
        success: false,
        error: getUnsupportedUrlMessage()
      })
      return
    }

    const result = await parseAndCreateShare(trimmedUrl)

    parseOperations.inc({ status: 'success', error_type: '' })
    res.status(201).json({
      success: true,
      shareId: result.id,
      shareUrl: `/s/${result.id}`
    })
  } catch (error) {
    console.error('Parse error:', error)

    if (error instanceof ConversationNotFoundError) {
      parseOperations.inc({ status: 'error', error_type: 'not_found' })
      res.status(404).json({
        success: false,
        error: 'Conversation not found. Please check the URL.'
      })
      return
    }

    if (error instanceof NoMessagesFoundError) {
      parseOperations.inc({ status: 'error', error_type: 'no_messages' })
      res.status(400).json({
        success: false,
        error: error.message
      })
      return
    }

    if (error instanceof InvalidUrlError) {
      parseOperations.inc({ status: 'error', error_type: 'invalid_url' })
      res.status(400).json({
        success: false,
        error: getUnsupportedUrlMessage()
      })
      return
    }

    if (error instanceof UnsupportedPlatformError) {
      parseOperations.inc({ status: 'error', error_type: 'unsupported_platform' })
      res.status(400).json({
        success: false,
        error: getUnsupportedUrlMessage()
      })
      return
    }

    // All other errors (including generic Error) are treated as server errors
    parseOperations.inc({ status: 'error', error_type: 'server_error' })
    res.status(500).json({
      success: false,
      error: 'Failed to parse the conversation. Please try again.'
    })
  }
})

// GET endpoint to list supported platforms
router.get('/platforms', (_req: Request, res: Response) => {
  res.json({
    success: true,
    patterns: getSupportedPatterns()
  })
})

export default router
