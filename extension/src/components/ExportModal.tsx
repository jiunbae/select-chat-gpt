import { useState } from "react"
import type { ChatMessage, ExportStyleType } from "~src/types"
import { getPageTitle } from "~src/hooks/useChatGPTMessages"
import { createShare } from "~src/utils/api"
import { convertToMarkdown } from "~src/utils/markdown"
import { exportToImage, exportToPDF, ExportError, type ExportProgress } from "~src/utils/export-image"

interface ExportModalProps {
  messages: ChatMessage[]
  onClose: () => void
}

type ExportMode = 'link' | 'markdown' | 'image' | 'pdf'

const MODE_LABELS: Record<ExportMode, string> = {
  link: 'Link',
  markdown: 'MD',
  image: 'PNG',
  pdf: 'PDF'
}

const STAGE_MESSAGES: Record<ExportProgress['stage'], string> = {
  preparing: 'Preparing...',
  rendering: 'Rendering...',
  generating: 'Generating...',
  downloading: 'Downloading...'
}

export function ExportModal({ messages, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('link')
  const [styleType, setStyleType] = useState<ExportStyleType>('chatgpt')
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)

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

  const handleExportImage = async () => {
    setIsLoading(true)
    setError(null)
    setExportProgress(null)

    try {
      await exportToImage(
        messages,
        getPageTitle(),
        styleType,
        setExportProgress
      )
    } catch (e) {
      if (e instanceof ExportError) {
        setError(e.message)
      } else {
        setError('Failed to export image')
      }
    } finally {
      setIsLoading(false)
      setExportProgress(null)
    }
  }

  const handleExportPDF = async () => {
    setIsLoading(true)
    setError(null)
    setExportProgress(null)

    try {
      await exportToPDF(
        messages,
        getPageTitle(),
        styleType,
        setExportProgress
      )
    } catch (e) {
      if (e instanceof ExportError) {
        setError(e.message)
      } else {
        setError('Failed to export PDF')
      }
    } finally {
      setIsLoading(false)
      setExportProgress(null)
    }
  }

  const showStyleSelector = mode === 'image' || mode === 'pdf'

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
              Export {messages.length} message{messages.length > 1 ? 's' : ''}
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
          {/* Mode Tabs */}
          <div className="scgpt-flex scgpt-gap-1 scgpt-mb-4">
            {(['link', 'markdown', 'image', 'pdf'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={`scgpt-flex-1 scgpt-py-2 scgpt-px-2 scgpt-rounded-lg scgpt-text-xs scgpt-font-medium scgpt-transition-colors ${
                  mode === m
                    ? 'scgpt-bg-primary scgpt-text-white'
                    : 'scgpt-bg-gray-100 scgpt-text-gray-700 scgpt-hover:bg-gray-200'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Style Selector for Image/PDF */}
          {showStyleSelector && (
            <div className="scgpt-mb-4">
              <label className="scgpt-block scgpt-text-sm scgpt-font-medium scgpt-text-gray-700 scgpt-mb-2">
                Style
              </label>
              <div className="scgpt-flex scgpt-gap-2">
                <button
                  onClick={() => setStyleType('chatgpt')}
                  className={`scgpt-flex-1 scgpt-py-2 scgpt-px-3 scgpt-rounded-lg scgpt-text-sm scgpt-border scgpt-transition-colors ${
                    styleType === 'chatgpt'
                      ? 'scgpt-border-primary scgpt-bg-primary/10 scgpt-text-primary'
                      : 'scgpt-border-gray-200 scgpt-text-gray-600 scgpt-hover:border-gray-300'
                  }`}
                >
                  <div className="scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2">
                    <div className="scgpt-w-4 scgpt-h-4 scgpt-rounded scgpt-bg-[#212121]" />
                    <span>ChatGPT</span>
                  </div>
                </button>
                <button
                  onClick={() => setStyleType('clean')}
                  className={`scgpt-flex-1 scgpt-py-2 scgpt-px-3 scgpt-rounded-lg scgpt-text-sm scgpt-border scgpt-transition-colors ${
                    styleType === 'clean'
                      ? 'scgpt-border-primary scgpt-bg-primary/10 scgpt-text-primary'
                      : 'scgpt-border-gray-200 scgpt-text-gray-600 scgpt-hover:border-gray-300'
                  }`}
                >
                  <div className="scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2">
                    <div className="scgpt-w-4 scgpt-h-4 scgpt-rounded scgpt-bg-white scgpt-border scgpt-border-gray-300" />
                    <span>Clean</span>
                  </div>
                </button>
              </div>
            </div>
          )}

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

          {mode === 'image' && (
            <div className="scgpt-space-y-3">
              <button
                onClick={handleExportImage}
                disabled={isLoading}
                className="scgpt-w-full scgpt-py-3 scgpt-bg-primary scgpt-text-white scgpt-rounded-lg scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-disabled:opacity-50 scgpt-disabled:cursor-not-allowed scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="scgpt-animate-spin scgpt-h-5 scgpt-w-5" viewBox="0 0 24 24">
                      <circle className="scgpt-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="scgpt-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {exportProgress ? STAGE_MESSAGES[exportProgress.stage] : 'Exporting...'}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Download as PNG
                  </>
                )}
              </button>
              <p className="scgpt-text-xs scgpt-text-gray-500 scgpt-text-center">
                High-quality image export for sharing on social media
              </p>
            </div>
          )}

          {mode === 'pdf' && (
            <div className="scgpt-space-y-3">
              <button
                onClick={handleExportPDF}
                disabled={isLoading}
                className="scgpt-w-full scgpt-py-3 scgpt-bg-primary scgpt-text-white scgpt-rounded-lg scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-disabled:opacity-50 scgpt-disabled:cursor-not-allowed scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="scgpt-animate-spin scgpt-h-5 scgpt-w-5" viewBox="0 0 24 24">
                      <circle className="scgpt-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="scgpt-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {exportProgress ? STAGE_MESSAGES[exportProgress.stage] : 'Exporting...'}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Download as PDF
                  </>
                )}
              </button>
              <p className="scgpt-text-xs scgpt-text-gray-500 scgpt-text-center">
                Multi-page PDF document for printing and archiving
              </p>
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
