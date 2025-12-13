import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import { createShare, getShare } from '../services/share.service.js'

const router: RouterType = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, sourceUrl, messages } = req.body

    const result = await createShare({ title, sourceUrl, messages })

    res.status(201).json(result)
  } catch (error) {
    console.error('Create share error:', error)

    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Failed to create share' })
    }
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id || id.length !== 10) {
      res.status(400).json({ error: 'Invalid share ID' })
      return
    }

    const share = await getShare(id)

    if (!share) {
      res.status(404).json({ error: 'Share not found' })
      return
    }

    // Set cache headers for CDN and browser caching
    // - public: can be cached by CDN
    // - max-age=60: browser cache for 60 seconds
    // - s-maxage=300: CDN cache for 5 minutes
    // - stale-while-revalidate=600: serve stale while refreshing for 10 minutes
    //
    // Trade-off: viewCount in cached responses may be slightly stale (up to 60s for browser,
    // 5min for CDN). This is acceptable because exact real-time viewCount is not critical
    // for this use case, and the performance benefit of caching outweighs the slight delay.
    // For real-time viewCount needs, consider a separate endpoint or WebSocket updates.
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')

    res.json(share)
  } catch (error) {
    console.error('Get share error:', error)
    res.status(500).json({ error: 'Failed to get share' })
  }
})

export default router
