// Google Analytics 4 event tracking utilities

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// Generic event tracking function
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

// Predefined events for the web app
export const Analytics = {
  // URL input and parsing
  urlSubmitted: (url: string) => trackEvent('url_submitted', {
    url_domain: new URL(url).hostname
  }),

  parseSuccess: (shareId: string) => trackEvent('parse_success', {
    share_id: shareId
  }),

  parseFailed: (error: string) => trackEvent('parse_failed', {
    error_message: error.substring(0, 100)
  }),

  // Share page events
  sharePageViewed: (shareId: string, messageCount: number) => trackEvent('share_page_viewed', {
    share_id: shareId,
    message_count: messageCount
  }),

  // Export events
  exportClicked: (format: 'image' | 'pdf' | 'markdown', messageCount: number) => trackEvent('export_clicked', {
    export_format: format,
    message_count: messageCount
  }),

  exportSuccess: (format: 'image' | 'pdf' | 'markdown') => trackEvent('export_success', {
    export_format: format
  }),

  exportFailed: (format: 'image' | 'pdf' | 'markdown', error: string) => trackEvent('export_failed', {
    export_format: format,
    error_message: error.substring(0, 100)
  }),

  // Style changes
  styleChanged: (styleType: string) => trackEvent('style_changed', {
    style_type: styleType
  }),

  // Content filtering
  hideUserMessagesToggled: (hidden: boolean) => trackEvent('hide_user_messages_toggled', {
    hidden: hidden
  }),

  hideCodeBlocksToggled: (hidden: boolean) => trackEvent('hide_code_blocks_toggled', {
    hidden: hidden
  }),

  // External link clicks
  originalLinkClicked: (url: string) => trackEvent('original_link_clicked', {
    url_domain: new URL(url).hostname
  }),

  extensionLinkClicked: () => trackEvent('extension_link_clicked'),

  githubLinkClicked: () => trackEvent('github_link_clicked')
}
