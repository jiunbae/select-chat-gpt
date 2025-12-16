import { useState } from "react"
import type { ChatMessage, ExportStyleType } from "~src/types"
import { getPageTitle } from "~src/hooks/useChatGPTMessages"
import { createShare } from "~src/utils/api"
import { convertToMarkdown } from "~src/utils/markdown"
import { t } from "~src/utils/i18n"
import {
  exportToImage,
  exportToPDF,
  ExportError,
  type ExportProgress,
  type ExportOptions,
  type LetterSpacing,
  type LineHeight,
  type FontSize,
  type PageSize,
  type MarginPreset,
  type CustomMargin,
  type PdfHeaderFooterOptions,
} from "~src/utils/export-image"

interface ExportModalProps {
  messages: ChatMessage[]
  onClose: () => void
}

type ExportMode = 'link' | 'markdown' | 'image' | 'pdf'

const getModeLabels = (): Record<ExportMode, string> => ({
  link: t('modeLink'),
  markdown: t('modeMarkdown'),
  image: t('modeImage'),
  pdf: t('modePDF')
})

const getStageMessages = (): Record<ExportProgress['stage'], string> => ({
  preparing: t('stagePreparing'),
  rendering: t('stageRendering'),
  generating: t('stageGenerating'),
  downloading: t('stageDownloading')
})

// Collapsible section component
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="scgpt-mb-3">
      <button
        onClick={onToggle}
        className="scgpt-flex scgpt-items-center scgpt-justify-between scgpt-w-full scgpt-py-2 scgpt-text-sm scgpt-font-medium scgpt-text-gray-700"
      >
        <span>{title}</span>
        <svg
          className={`scgpt-w-4 scgpt-h-4 scgpt-transition-transform ${isOpen ? 'scgpt-rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="scgpt-pt-2 scgpt-space-y-3">{children}</div>}
    </div>
  )
}

// Select field component
function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="scgpt-flex scgpt-items-center scgpt-justify-between">
      <label className="scgpt-text-sm scgpt-text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="scgpt-px-2 scgpt-py-1 scgpt-text-sm scgpt-border scgpt-border-gray-200 scgpt-rounded-md scgpt-bg-white scgpt-text-gray-900"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Checkbox field component
function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="scgpt-flex scgpt-items-center scgpt-gap-2 scgpt-text-sm scgpt-text-gray-600 scgpt-cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="scgpt-w-4 scgpt-h-4 scgpt-rounded scgpt-border-gray-300"
      />
      {label}
    </label>
  )
}

interface ExportActionConfig {
  icon: React.ReactNode
  label: string
  description: string
  handler: () => void
}

const ImageIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const PdfIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

export function ExportModal({ messages, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('link')
  const [styleType, setStyleType] = useState<ExportStyleType>('chatgpt')
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)

  // Styling options state
  const [letterSpacing, setLetterSpacing] = useState<LetterSpacing>('normal')
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal')
  const [fontSize, setFontSize] = useState<FontSize>('base')
  const [hideUserMessages, setHideUserMessages] = useState(false)
  const [hideCodeBlocks, setHideCodeBlocks] = useState(false)
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [margin, setMargin] = useState<MarginPreset>('normal')
  const [customMargin, setCustomMargin] = useState<CustomMargin>({
    top: '15mm',
    bottom: '15mm',
    left: '15mm',
    right: '15mm',
  })

  // Header/Footer options state (default: only page numbers ON)
  const [showBranding, setShowBranding] = useState(false)
  const [showDate, setShowDate] = useState(false)
  const [showTitle, setShowTitle] = useState(false)
  const [showPageNumbers, setShowPageNumbers] = useState(true)
  const [showDomain, setShowDomain] = useState(false)

  // Collapsible sections state
  const [textStylingOpen, setTextStylingOpen] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [headerFooterOpen, setHeaderFooterOpen] = useState(false)

  // Build export options
  const getExportOptions = (): ExportOptions => ({
    letterSpacing,
    lineHeight,
    fontSize,
    hideUserMessages,
    hideCodeBlocks,
    pageSize,
    margin,
    customMargin: margin === 'custom' ? customMargin : undefined,
    pdfHeaderFooter: {
      showBranding,
      showDate,
      showTitle,
      showPageNumbers,
      showDomain,
    },
  })

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
      setError(e instanceof Error ? e.message : t('failedToCreateShare'))
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
      setError(t('failedToCopy'))
    }
  }

  const handleCopyMarkdown = async () => {
    try {
      const markdown = convertToMarkdown(messages, getPageTitle())
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError(t('failedToCopyMarkdown'))
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

  const createExportHandler = (
    exportFn: typeof exportToImage,
    errorMessage: string
  ) => async () => {
    setIsLoading(true)
    setError(null)
    setExportProgress(null)

    try {
      const options = getExportOptions()
      await exportFn(messages, getPageTitle(), styleType, setExportProgress, options)
    } catch (e) {
      if (e instanceof ExportError) {
        setError(e.message)
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
      setExportProgress(null)
    }
  }

  const handleExportImage = createExportHandler(exportToImage, t('failedToExportImage'))
  const handleExportPDF = createExportHandler(exportToPDF, t('failedToExportPDF'))

  const getExportActions = (): Record<'image' | 'pdf', ExportActionConfig> => ({
    image: {
      icon: ImageIcon,
      label: t('downloadAsPNG'),
      description: t('imageExportDesc'),
      handler: handleExportImage,
    },
    pdf: {
      icon: PdfIcon,
      label: t('downloadAsPDF'),
      description: t('pdfExportDesc'),
      handler: handleExportPDF,
    },
  })

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
              {t('exportMessages', [String(messages.length), messages.length > 1 ? 's' : ''])}
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
                {getModeLabels()[m]}
              </button>
            ))}
          </div>

          {/* Style Selector for Image/PDF */}
          {showStyleSelector && (
            <div className="scgpt-mb-4">
              <label className="scgpt-block scgpt-text-sm scgpt-font-medium scgpt-text-gray-700 scgpt-mb-2">
                {t('style')}
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
                    <span>{t('styleChatGPT')}</span>
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
                    <span>{t('styleClean')}</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Text Styling Options (image/pdf only) */}
          {showStyleSelector && (
            <CollapsibleSection
              title={t('textStyling')}
              isOpen={textStylingOpen}
              onToggle={() => setTextStylingOpen(!textStylingOpen)}
            >
              <SelectField
                label={t('fontSize')}
                value={fontSize}
                options={[
                  { value: 'xs', label: '12px' },
                  { value: 'sm', label: '14px' },
                  { value: 'base', label: '16px' },
                  { value: 'lg', label: '18px' },
                  { value: 'xl', label: '20px' },
                  { value: '2xl', label: '24px' },
                ]}
                onChange={setFontSize}
              />
              <SelectField
                label={t('lineHeight')}
                value={lineHeight}
                options={[
                  { value: 'tight', label: '1.25' },
                  { value: 'snug', label: '1.375' },
                  { value: 'normal', label: '1.5' },
                  { value: 'relaxed', label: '1.625' },
                  { value: 'loose', label: '2.0' },
                ]}
                onChange={setLineHeight}
              />
              <SelectField
                label={t('letterSpacing')}
                value={letterSpacing}
                options={[
                  { value: 'tighter', label: '-0.05em' },
                  { value: 'tight', label: '-0.025em' },
                  { value: 'normal', label: '0' },
                  { value: 'wide', label: '0.025em' },
                  { value: 'wider', label: '0.05em' },
                ]}
                onChange={setLetterSpacing}
              />
            </CollapsibleSection>
          )}

          {/* Content Filtering Options (markdown/image/pdf) */}
          {mode !== 'link' && (
            <CollapsibleSection
              title={t('content')}
              isOpen={contentOpen}
              onToggle={() => setContentOpen(!contentOpen)}
            >
              <CheckboxField
                label={t('hideUserQuestions')}
                checked={hideUserMessages}
                onChange={setHideUserMessages}
              />
              <CheckboxField
                label={t('hideCodeBlocks')}
                checked={hideCodeBlocks}
                onChange={setHideCodeBlocks}
              />
            </CollapsibleSection>
          )}

          {/* Layout Options (pdf only) */}
          {mode === 'pdf' && (
            <CollapsibleSection
              title={t('layout')}
              isOpen={layoutOpen}
              onToggle={() => setLayoutOpen(!layoutOpen)}
            >
              <SelectField
                label={t('pageSize')}
                value={pageSize}
                options={[
                  { value: 'a4', label: 'A4' },
                  { value: 'letter', label: 'Letter' },
                  { value: 'a5', label: 'A5' },
                ]}
                onChange={setPageSize}
              />
              <SelectField
                label={t('margin')}
                value={margin}
                options={[
                  { value: 'none', label: t('marginNone') },
                  { value: 'minimal', label: t('marginMinimal') },
                  { value: 'compact', label: t('marginCompact') },
                  { value: 'normal', label: t('marginNormal') },
                  { value: 'wide', label: t('marginWide') },
                  { value: 'a4-standard', label: t('marginA4Standard') },
                  { value: 'custom', label: t('marginCustom') },
                ]}
                onChange={setMargin}
              />
              {margin === 'custom' && (
                <div className="scgpt-grid scgpt-grid-cols-2 scgpt-gap-2 scgpt-mt-2">
                  <div className="scgpt-flex scgpt-items-center scgpt-gap-2">
                    <label className="scgpt-text-xs scgpt-text-gray-500 scgpt-w-10">{t('marginTop')}</label>
                    <input
                      type="text"
                      value={customMargin.top}
                      onChange={(e) => setCustomMargin({ ...customMargin, top: e.target.value })}
                      className="scgpt-flex-1 scgpt-px-2 scgpt-py-1 scgpt-text-xs scgpt-border scgpt-border-gray-200 scgpt-rounded"
                      placeholder="15mm"
                    />
                  </div>
                  <div className="scgpt-flex scgpt-items-center scgpt-gap-2">
                    <label className="scgpt-text-xs scgpt-text-gray-500 scgpt-w-10">{t('marginBottom')}</label>
                    <input
                      type="text"
                      value={customMargin.bottom}
                      onChange={(e) => setCustomMargin({ ...customMargin, bottom: e.target.value })}
                      className="scgpt-flex-1 scgpt-px-2 scgpt-py-1 scgpt-text-xs scgpt-border scgpt-border-gray-200 scgpt-rounded"
                      placeholder="15mm"
                    />
                  </div>
                  <div className="scgpt-flex scgpt-items-center scgpt-gap-2">
                    <label className="scgpt-text-xs scgpt-text-gray-500 scgpt-w-10">{t('marginLeft')}</label>
                    <input
                      type="text"
                      value={customMargin.left}
                      onChange={(e) => setCustomMargin({ ...customMargin, left: e.target.value })}
                      className="scgpt-flex-1 scgpt-px-2 scgpt-py-1 scgpt-text-xs scgpt-border scgpt-border-gray-200 scgpt-rounded"
                      placeholder="15mm"
                    />
                  </div>
                  <div className="scgpt-flex scgpt-items-center scgpt-gap-2">
                    <label className="scgpt-text-xs scgpt-text-gray-500 scgpt-w-10">{t('marginRight')}</label>
                    <input
                      type="text"
                      value={customMargin.right}
                      onChange={(e) => setCustomMargin({ ...customMargin, right: e.target.value })}
                      className="scgpt-flex-1 scgpt-px-2 scgpt-py-1 scgpt-text-xs scgpt-border scgpt-border-gray-200 scgpt-rounded"
                      placeholder="15mm"
                    />
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Header & Footer Options (pdf only) */}
          {mode === 'pdf' && (
            <CollapsibleSection
              title={t('headerFooter')}
              isOpen={headerFooterOpen}
              onToggle={() => setHeaderFooterOpen(!headerFooterOpen)}
            >
              <CheckboxField
                label={t('showDate')}
                checked={showDate}
                onChange={setShowDate}
              />
              <CheckboxField
                label={t('showTitle')}
                checked={showTitle}
                onChange={setShowTitle}
              />
              <CheckboxField
                label={t('showPageNumbers')}
                checked={showPageNumbers}
                onChange={setShowPageNumbers}
              />
              <CheckboxField
                label={t('showDomain')}
                checked={showDomain}
                onChange={setShowDomain}
              />
              <CheckboxField
                label={t('showBranding')}
                checked={showBranding}
                onChange={setShowBranding}
              />
            </CollapsibleSection>
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
                      {t('creating')}
                    </>
                  ) : (
                    t('generateShareLink')
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
                      {copied ? t('copied') : t('copy')}
                    </button>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scgpt-block scgpt-text-center scgpt-text-sm scgpt-text-primary scgpt-hover:underline"
                  >
                    {t('openInNewTab')}
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
                {copied ? t('copied') : t('copyAsMarkdown')}
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
                {t('downloadMdFile')}
              </button>
            </div>
          )}

          {(mode === 'image' || mode === 'pdf') && (
            <div className="scgpt-space-y-3">
              <button
                onClick={getExportActions()[mode].handler}
                disabled={isLoading}
                className="scgpt-w-full scgpt-py-3 scgpt-bg-primary scgpt-text-white scgpt-rounded-lg scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-disabled:opacity-50 scgpt-disabled:cursor-not-allowed scgpt-flex scgpt-items-center scgpt-justify-center scgpt-gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="scgpt-animate-spin scgpt-h-5 scgpt-w-5" viewBox="0 0 24 24">
                      <circle className="scgpt-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="scgpt-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {exportProgress ? getStageMessages()[exportProgress.stage] : t('exporting')}
                  </>
                ) : (
                  <>
                    {getExportActions()[mode].icon}
                    {getExportActions()[mode].label}
                  </>
                )}
              </button>
              <p className="scgpt-text-xs scgpt-text-gray-500 scgpt-text-center">
                {getExportActions()[mode].description}
              </p>
            </div>
          )}
        </div>

        <div className="scgpt-px-6 scgpt-py-3 scgpt-bg-gray-50 scgpt-text-xs scgpt-text-gray-500 scgpt-text-center">
          {t('poweredBy')}
        </div>
      </div>
    </div>
  )
}
