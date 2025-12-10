import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import { parseAndCreateShare, isValidChatGPTShareUrl } from '../services/parse.service.js'

const router: RouterType = Router()

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

    if (!isValidChatGPTShareUrl(trimmedUrl)) {
      res.status(400).json({
        success: false,
        error: 'Invalid ChatGPT share URL. Please use a URL like https://chatgpt.com/share/...'
      })
      return
    }

    const result = await parseAndCreateShare(trimmedUrl)

    res.status(201).json({
      success: true,
      shareId: result.id,
      shareUrl: `/s/${result.id}`
    })
  } catch (error) {
    console.error('Parse error:', error)

    if (error instanceof Error) {
      const message = error.message

      if (message.includes('not found') || message.includes('404')) {
        res.status(404).json({
          success: false,
          error: 'ChatGPT conversation not found. Please check the URL.'
        })
        return
      }

      if (message.includes('No messages')) {
        res.status(400).json({
          success: false,
          error: 'No messages found in the conversation.'
        })
        return
      }

      res.status(400).json({
        success: false,
        error: message
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Failed to parse the conversation. Please try again.'
    })
  }
})

export default router
