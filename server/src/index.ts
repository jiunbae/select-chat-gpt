import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

import shareRoutes from './routes/share.js'
import parseRoutes from './routes/parse.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy (nginx, load balancer, etc.) for accurate client IP identification.
// The number of hops is configured via the TRUST_PROXY_HOPS environment variable.
const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || '', 10)
app.set('trust proxy', !isNaN(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 1)

app.use(helmet())

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',')
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

app.use('/api/shares', shareRoutes)
app.use('/api/parse', parseRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/selectchatgpt'
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
