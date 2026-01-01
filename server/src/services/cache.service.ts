import Redis from 'ioredis'
import { cacheHits, cacheMisses, redisConnected } from '../metrics.js'

const DEFAULT_TTL = 300 // 5 minutes in seconds

let redis: Redis | null = null
let isConnected = false

/**
 * Initialize Redis connection
 * Uses REDIS_URL environment variable for configuration
 */
export function initRedis(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    lazyConnect: false,
  })

  redis.on('connect', () => {
    console.log('Redis connected')
    isConnected = true
    redisConnected.set(1)
  })

  redis.on('error', (err) => {
    console.error('Redis error:', err.message)
    isConnected = false
    redisConnected.set(0)
  })

  redis.on('close', () => {
    console.log('Redis connection closed')
    isConnected = false
    redisConnected.set(0)
  })

  return redis
}

/**
 * Get Redis client instance
 */
export function getRedis(): Redis | null {
  return redis
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redis !== null
}

/**
 * Get a value from cache
 * @param key Cache key
 * @returns Parsed value or null if not found/error
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!redis || !isConnected) {
    cacheMisses.inc({ reason: 'disconnected' })
    return null
  }

  try {
    const value = await redis.get(key)
    if (value === null) {
      cacheMisses.inc({ reason: 'not_found' })
      return null
    }

    cacheHits.inc()
    return JSON.parse(value) as T
  } catch (error) {
    console.error('Cache get error:', error instanceof Error ? error.message : String(error))
    cacheMisses.inc({ reason: 'error' })
    return null
  }
}

/**
 * Set a value in cache
 * @param key Cache key
 * @param value Value to cache (will be JSON serialized)
 * @param ttl Time to live in seconds (default: 5 minutes)
 */
export async function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<boolean> {
  if (!redis || !isConnected) {
    return false
  }

  try {
    const serialized = JSON.stringify(value)
    await redis.setex(key, ttl, serialized)
    return true
  } catch (error) {
    console.error('Cache set error:', error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Delete a value from cache
 * @param key Cache key
 */
export async function del(key: string): Promise<boolean> {
  if (!redis || !isConnected) {
    return false
  }

  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error('Cache del error:', error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Gracefully shutdown Redis connection
 */
export async function shutdownRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
    isConnected = false
    console.log('Redis shutdown complete')
  }
}
