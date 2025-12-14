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
