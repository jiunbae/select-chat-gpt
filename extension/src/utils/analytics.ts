// Google Analytics 4 Measurement Protocol for Chrome Extension
// https://developers.google.com/analytics/devguides/collection/protocol/ga4

const GA_MEASUREMENT_ID = process.env.PLASMO_PUBLIC_GA_MEASUREMENT_ID
const GA_API_SECRET = process.env.PLASMO_PUBLIC_GA_API_SECRET || ''

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect'

// Generate or retrieve a unique client ID for this extension user
async function getClientId(): Promise<string> {
  const storage = await chrome.storage.local.get('ga_client_id')
  if (storage.ga_client_id) {
    return storage.ga_client_id
  }

  // Generate a new client ID (UUID v4 format)
  const clientId = crypto.randomUUID()
  await chrome.storage.local.set({ ga_client_id: clientId })
  return clientId
}

// Get session ID (expires after 30 minutes of inactivity)
async function getSessionId(): Promise<string> {
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  const now = Date.now()

  const storage = await chrome.storage.local.get(['ga_session_id', 'ga_session_timestamp'])

  if (storage.ga_session_id && storage.ga_session_timestamp) {
    const elapsed = now - storage.ga_session_timestamp
    if (elapsed < SESSION_TIMEOUT) {
      // Update timestamp and return existing session
      await chrome.storage.local.set({ ga_session_timestamp: now })
      return storage.ga_session_id
    }
  }

  // Create new session
  const sessionId = String(now)
  await chrome.storage.local.set({
    ga_session_id: sessionId,
    ga_session_timestamp: now
  })
  return sessionId
}

interface EventParams {
  [key: string]: string | number | boolean
}

// Send event to GA4
export async function trackEvent(
  eventName: string,
  params: EventParams = {}
): Promise<void> {
  // Skip if no API secret configured
  if (!GA_API_SECRET) {
    console.log('[Analytics] GA API Secret not configured, skipping:', eventName, params)
    return
  }

  try {
    const clientId = await getClientId()
    const sessionId = await getSessionId()

    const payload = {
      client_id: clientId,
      events: [
        {
          name: eventName,
          params: {
            session_id: sessionId,
            engagement_time_msec: 100,
            ...params
          }
        }
      ]
    }

    const url = `${GA_ENDPOINT}?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    console.log('[Analytics] Event sent:', eventName, params)
  } catch (error) {
    console.error('[Analytics] Failed to send event:', error)
  }
}

// Predefined events for the extension
export const Analytics = {
  // Extension loaded on ChatGPT share page
  pageView: (url: string) => trackEvent('page_view', {
    page_location: url,
    page_title: document.title
  }),

  // User selected messages
  messagesSelected: (count: number, total: number) => trackEvent('messages_selected', {
    selected_count: count,
    total_count: total
  }),

  // User clicked share button
  shareClicked: (messageCount: number) => trackEvent('share_clicked', {
    message_count: messageCount
  }),

  // Share created successfully
  shareCreated: (shareId: string, messageCount: number) => trackEvent('share_created', {
    share_id: shareId,
    message_count: messageCount
  }),

  // Share creation failed
  shareFailed: (error: string) => trackEvent('share_failed', {
    error_message: error
  }),

  // Export action
  exportClicked: (format: 'image' | 'pdf' | 'markdown') => trackEvent('export_clicked', {
    export_format: format
  }),

  // Copy to clipboard
  copyClicked: () => trackEvent('copy_clicked'),

  // Popup opened
  popupOpened: () => trackEvent('popup_opened'),

  // Select all / Deselect all
  selectAll: (total: number) => trackEvent('select_all', { total_count: total }),
  deselectAll: () => trackEvent('deselect_all')
}
