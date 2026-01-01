import client from 'prom-client'

// Create a Registry
export const register = new client.Registry()

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'selectchatgpt_server_',
})

// HTTP Request Duration Histogram
export const httpRequestDuration = new client.Histogram({
  name: 'selectchatgpt_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

// HTTP Request Counter
export const httpRequestTotal = new client.Counter({
  name: 'selectchatgpt_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

// Share Operations Counter
export const shareOperations = new client.Counter({
  name: 'selectchatgpt_share_operations_total',
  help: 'Total share operations',
  labelNames: ['operation', 'status'], // operation: create|get, status: success|error|not_found
  registers: [register],
})

// Parse Operations Counter
export const parseOperations = new client.Counter({
  name: 'selectchatgpt_parse_operations_total',
  help: 'Total parse operations',
  labelNames: ['status', 'error_type'], // status: success|error, error_type: not_found|no_messages|invalid_url|server_error
  registers: [register],
})

// Parse Success Counter - tracks successful parse operations
export const parseSuccessTotal = new client.Counter({
  name: 'selectchatgpt_parse_success_total',
  help: 'Total successful parse operations',
  registers: [register],
})

// Parse Failure Counter - tracks failed parse operations (all strategies failed)
export const parseFailureTotal = new client.Counter({
  name: 'selectchatgpt_parse_failure_total',
  help: 'Total failed parse operations where all strategies failed',
  registers: [register],
})

// Parse Fallback Used Counter - tracks when fallback strategies are used
export const parseFallbackUsed = new client.Counter({
  name: 'selectchatgpt_parse_fallback_used_total',
  help: 'Total times fallback strategies were used for parsing',
  labelNames: ['strategy'], // strategy: heuristic|manual
  registers: [register],
})

// MongoDB Connection Status Gauge
export const mongodbConnected = new client.Gauge({
  name: 'selectchatgpt_mongodb_connected',
  help: 'MongoDB connection status (1=connected, 0=disconnected)',
  registers: [register],
})

// Active HTTP Connections Gauge
export const activeConnections = new client.Gauge({
  name: 'selectchatgpt_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
})

// Cache Hit Counter
export const cacheHits = new client.Counter({
  name: 'selectchatgpt_cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register],
})

// Cache Miss Counter
export const cacheMisses = new client.Counter({
  name: 'selectchatgpt_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['reason'], // reason: not_found|disconnected|error
  registers: [register],
})

// Redis Connection Status Gauge
export const redisConnected = new client.Gauge({
  name: 'selectchatgpt_redis_connected',
  help: 'Redis connection status (1=connected, 0=disconnected)',
  registers: [register],
})
