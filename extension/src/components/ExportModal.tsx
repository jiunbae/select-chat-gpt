import { useState } from "react"
import type { ChatMessage } from "~src/types"
import { getPageTitle } from "~src/hooks/useChatGPTMessages"
import { createShare } from "~src/utils/api"
import { convertToMarkdown } from "~src/utils/markdown"

interface ExportModalProps {
  messages: ChatMessage[]
  onClose: () => void
}

type ExportMode = 'link' | 'markdown' | 'image'

export function ExportModal({ messages, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('link')
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateLink = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const title = getPageTitle()
      const sourceUrl = window.location.href

      const response = await createShare({
        title,
        sourceUrl,
        messages: messages.map(({ id, role, content, html }) => ({
          id,
          role,
          content,
          html
        }))
      })

      setShareUrl(response.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError('Failed to copy to clipboard')
    }
  }

  const handleCopyMarkdown = async () => {
    try {
      const markdown = convertToMarkdown(messages, getPageTitle())
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError('Failed to copy markdown')
    }
  }

  const handleDownloadMarkdown = () => {
    const markdown = convertToMarkdown(messages, getPageTitle())
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${getPageTitle().replace(/[^a-z0-9]/gi, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="scgpt-fixed scgpt-inset-0 scgpt-bg-black/50 scgpt-flex scgpt-items-center scgpt-justify-center scgpt-z-[10001]"
      onClick={onClose}
    >
      <div
        className="scgpt-bg-white scgpt-rounded-2xl scgpt-shadow-2xl scgpt-w-full scgpt-max-w-md scgpt-mx-4 scgpt-overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="scgpt-px-6 scgpt-py-4 scgpt-border-b scgpt-border-gray-100">
          <div className="scgpt-flex scgpt-items-center scgpt-justify-between">
            <h2 className="scgpt-text-lg scgpt-font-semibold scgpt-text-gray-900">
              Share {messages.length} message{messages.length > 1 ? 's' : ''}
            </h2>
            <button
              onClick={onClose}
              className="scgpt-p-1 scgpt-hover:bg-gray-100 scgpt-rounded-md scgpt-transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="scgpt-px-6 scgpt-py-4">
          <div className="scgpt-flex scgpt-gap-2 scgpt-mb-4">
            <button
              onClick={() => setMode('link')}
              className={`scgpt-flex-1 scgpt-py-2 scgpt-px-3 scgpt-rounded-lg scgpt-text-sm scgpt-font-medium scgpt-transition-colors ${
                mode === 'link'
                  ? 'scgpt-bg-primary scgpt-text-white'
                  : 'scgpt-bg-gray-100 scgpt-text-gray-700 scgpt-hover:bg-gray-200'
              }`}
            >
              Share Link
            </button>
            <button
              onClick={() => setMode('markdown')}
              className={`scgpt-flex-1 scgpt-py-2 scgpt-px-3 scgpt-rounded-lg scgpt-text-sm scgpt-font-medium scgpt-transition-colors ${
                mode === 'markdown'
                  ? 'scgpt-bg-primary scgpt-text-white'
                  : 'scgpt-bg-gray-100 scgpt-text-gray-700 scgpt-hover:bg-gray-200'
              }`}
            >
              Markdown
            </button>
          </div>

          {error && (
            <div className="scgpt-mb-4 scgpt-p-3 scgpt-bg-red-50 scgpt-text-red-600 scgpt-text-sm scgpt-rounded-lg">
              {error}
            </div>
          )}

          {mode === 'link' && (
            <div className="scgpt-space-y-4">
              {!shareUrl ? (
                <button
                  onClick={handleCreateLink}
                  disabled={isLoading}
                  className="scgpt-w-full scgpt-py-3 scgpt-bg-primary scgpt-text-white scgpt-rounded-lg scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-disabled:opacity-50 scgpt-disabled:cursor-not-allowed scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="scgpt-animate-spin scgpt-h-5 scgpt-w-5" viewBox="0 0 24 24">
                        <circle className="scgpt-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="scgpt-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Generate Share Link'
                  )}
                </button>
              ) : (
                <div className="scgpt-space-y-3">
                  <div className="scgpt-flex scgpt-items-center scgpt-gap-2 scgpt-p-3 scgpt-bg-gray-50 scgpt-rounded-lg">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="scgpt-flex-1 scgpt-bg-transparent scgpt-text-sm scgpt-text-gray-700 scgpt-outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="scgpt-px-3 scgpt-py-1.5 scgpt-bg-primary scgpt-text-white scgpt-rounded-md scgpt-text-sm scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scgpt-block scgpt-text-center scgpt-text-sm scgpt-text-primary scgpt-hover:underline"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          )}

          {mode === 'markdown' && (
            <div className="scgpt-space-y-3">
              <button
                onClick={handleCopyMarkdown}
                className="scgpt-w-full scgpt-py-3 scgpt-bg-primary scgpt-text-white scgpt-rounded-lg scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? 'Copied!' : 'Copy as Markdown'}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="scgpt-w-full scgpt-py-3 scgpt-bg-gray-100 scgpt-text-gray-700 scgpt-rounded-lg scgpt-font-medium scgpt-hover:bg-gray-200 scgpt-transition-colors scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download .md File
              </button>
            </div>
          )}
        </div>

        <div className="scgpt-px-6 scgpt-py-3 scgpt-bg-gray-50 scgpt-text-xs scgpt-text-gray-500 scgpt-text-center">
          Powered by SelectChatGPT
        </div>
      </div>
    </div>
  )
}
