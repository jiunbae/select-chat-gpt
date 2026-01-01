/**
 * Internationalization utility for Chrome Extension
 * Uses Chrome's native i18n API
 */

type MessageKey =
  | 'extName'
  | 'extDescription'
  | 'shareSelectedMessages'
  | 'howToUse'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'openChatGPT'
  | 'exportMessages'
  | 'modeLink'
  | 'modeMarkdown'
  | 'modeImage'
  | 'modePDF'
  | 'stagePreparing'
  | 'stageRendering'
  | 'stageGenerating'
  | 'stageDownloading'
  | 'style'
  | 'styleChatGPT'
  | 'styleClean'
  | 'textStyling'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'content'
  | 'hideUserQuestions'
  | 'hideCodeBlocks'
  | 'layout'
  | 'pageSize'
  | 'margin'
  | 'marginCompact'
  | 'marginNormal'
  | 'marginWide'
  | 'generateShareLink'
  | 'creating'
  | 'copied'
  | 'copy'
  | 'openInNewTab'
  | 'copyAsMarkdown'
  | 'downloadMdFile'
  | 'downloadAsPNG'
  | 'downloadAsPDF'
  | 'exporting'
  | 'imageExportDesc'
  | 'pdfExportDesc'
  | 'poweredBy'
  | 'selected'
  | 'selectAll'
  | 'deselectAll'
  | 'clear'
  | 'usageRemaining'
  | 'usageLimitReached'
  | 'createShareLink'
  | 'failedToCreateShare'
  | 'failedToCopy'
  | 'failedToCopyMarkdown'
  | 'failedToExportImage'
  | 'failedToExportPDF'
  // Search and filter
  | 'searchFilter'
  | 'searchPlaceholder'
  | 'filterAll'
  | 'filterUser'
  | 'filterAssistant'
  | 'codeOnly'
  | 'selectLastN'
  | 'lastNMessages'
  | 'matchedCount'
  | 'clearFilters'

/**
 * Get localized message
 * @param key - Message key from messages.json
 * @param substitutions - Optional substitution strings
 * @returns Localized message string
 */
export function t(key: MessageKey, substitutions?: string | string[]): string {
  try {
    return chrome.i18n.getMessage(key, substitutions) || key
  } catch {
    // Fallback for environments where chrome.i18n is not available
    return key
  }
}

/**
 * Get current UI language
 * @returns Language code (e.g., 'en', 'ko', 'zh')
 */
export function getUILanguage(): string {
  try {
    return chrome.i18n.getUILanguage()
  } catch {
    return 'en'
  }
}

/**
 * Get accept languages
 * @returns Promise resolving to array of accepted language codes
 */
export function getAcceptLanguages(): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      chrome.i18n.getAcceptLanguages((languages) => {
        resolve(languages || ['en'])
      })
    } catch {
      resolve(['en'])
    }
  })
}
