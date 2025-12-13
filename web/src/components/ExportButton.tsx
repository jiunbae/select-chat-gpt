'use client';

import { useState } from 'react';
import type { Message } from '@/lib/api';
import {
  exportToImage,
  exportToPDF,
  exportToMarkdown,
  downloadMarkdown,
  ExportError,
  type ExportStyleType,
  type ExportProgress,
  type ExportOptions,
  type LetterSpacing,
  type LineHeight,
  type FontSize,
  type PageSize,
  type Margin,
} from '@/lib/export';
import { Analytics } from '@/lib/analytics';

interface ExportButtonProps {
  messages: Message[];
  title: string;
  sourceUrl: string;
  // External style control (optional - for SharePage integration)
  styleType?: ExportStyleType;
  exportOptions?: ExportOptions;
  disabled?: boolean;
}

type ExportMode = 'markdown' | 'image' | 'pdf';

const MODE_LABELS: Record<ExportMode, string> = {
  markdown: 'MD',
  image: 'PNG',
  pdf: 'PDF',
};

const STAGE_MESSAGES: Record<ExportProgress['stage'], string> = {
  preparing: 'Preparing...',
  rendering: 'Rendering...',
  generating: 'Generating...',
  downloading: 'Downloading...',
};

// Collapsible section component
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pt-2 space-y-3">{children}</div>}
    </div>
  );
}

// Select field component
function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Checkbox field component
function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
      />
      {label}
    </label>
  );
}

interface ExportActionConfig {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const ImageIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const PdfIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

export function ExportButton({
  messages,
  title,
  sourceUrl,
  styleType: externalStyleType,
  exportOptions: externalExportOptions,
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ExportMode>('markdown');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [copied, setCopied] = useState(false);

  // Internal state (used when external props are not provided)
  const [internalStyleType, setInternalStyleType] = useState<ExportStyleType>('chatgpt');
  const [letterSpacing, setLetterSpacing] = useState<LetterSpacing>('normal');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [hideUserMessages, setHideUserMessages] = useState(false);
  const [hideCodeBlocks, setHideCodeBlocks] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [margin, setMargin] = useState<Margin>('normal');

  // Collapsible sections state
  const [textStylingOpen, setTextStylingOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);

  // Use external values if provided, otherwise use internal state
  const hasExternalControl = externalStyleType !== undefined && externalExportOptions !== undefined;
  const styleType = externalStyleType ?? internalStyleType;
  const setStyleType = hasExternalControl ? () => {} : setInternalStyleType;

  // Build export options
  const getExportOptions = (): ExportOptions => {
    if (externalExportOptions) {
      return externalExportOptions;
    }
    return {
      letterSpacing,
      lineHeight,
      fontSize,
      hideUserMessages,
      hideCodeBlocks,
      pageSize,
      margin,
    };
  };

  const handleCopyMarkdown = async () => {
    // Track export clicked
    Analytics.exportClicked('markdown', messages.length);

    try {
      const options = getExportOptions();
      const markdown = await exportToMarkdown(messages, title, sourceUrl, options);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Track export success
      Analytics.exportSuccess('markdown');
    } catch (e) {
      // Track export failed
      Analytics.exportFailed('markdown', e instanceof Error ? e.message : 'Unknown error');
      setError('Failed to copy markdown');
    }
  };

  const handleDownloadMarkdown = async () => {
    // Track export clicked
    Analytics.exportClicked('markdown', messages.length);

    try {
      const options = getExportOptions();
      const markdown = await exportToMarkdown(messages, title, sourceUrl, options);
      downloadMarkdown(markdown, title);

      // Track export success
      Analytics.exportSuccess('markdown');
    } catch (e) {
      // Track export failed
      Analytics.exportFailed('markdown', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const createExportHandler = (
    exportFn: typeof exportToImage,
    format: 'image' | 'pdf',
    errorMessage: string
  ) => async () => {
    // Track export clicked
    Analytics.exportClicked(format, messages.length);

    setIsLoading(true);
    setError(null);
    setExportProgress(null);

    try {
      const options = getExportOptions();
      await exportFn(messages, title, styleType, setExportProgress, options);

      // Track export success
      Analytics.exportSuccess(format);
    } catch (e) {
      const errMsg = e instanceof ExportError ? e.message : errorMessage;

      // Track export failed
      Analytics.exportFailed(format, errMsg);

      if (e instanceof ExportError) {
        setError(e.message);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setExportProgress(null);
    }
  };

  const handleExportImage = createExportHandler(exportToImage, 'image', 'Failed to export image');
  const handleExportPDF = createExportHandler(exportToPDF, 'pdf', 'Failed to export PDF');

  const EXPORT_ACTIONS: Record<'image' | 'pdf', ExportActionConfig & { handler: () => void }> = {
    image: {
      icon: ImageIcon,
      label: 'Download as PNG',
      description: 'High-quality image export for sharing',
      handler: handleExportImage,
    },
    pdf: {
      icon: PdfIcon,
      label: 'Download as PDF',
      description: 'Multi-page PDF for printing and archiving',
      handler: handleExportPDF,
    },
  };

  // Only show style controls if no external control
  const showStyleSelector = !hasExternalControl && (mode === 'image' || mode === 'pdf');
  const showContentOptions = !hasExternalControl;
  const showLayoutOptions = !hasExternalControl && mode === 'pdf';

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-hover'
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Export Conversation
              </h3>
            </div>

            <div className="p-4">
              {/* Mode Tabs */}
              <div className="flex gap-1 mb-4">
                {(['markdown', 'image', 'pdf'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      mode === m
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>

              {/* Style Selector for Image/PDF */}
              {showStyleSelector && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Style
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyleType('chatgpt')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                        styleType === 'chatgpt'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#212121]" />
                        <span>ChatGPT</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setStyleType('clean')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                        styleType === 'clean'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded bg-white border border-gray-300" />
                        <span>Clean</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Text Styling Options (image/pdf only) */}
              {showStyleSelector && (
                <CollapsibleSection
                  title="Text Styling"
                  isOpen={textStylingOpen}
                  onToggle={() => setTextStylingOpen(!textStylingOpen)}
                >
                  <SelectField
                    label="Font Size"
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
                    label="Line Height"
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
                    label="Letter Spacing"
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

              {/* Content Filtering Options (all modes, only when no external control) */}
              {showContentOptions && (
                <CollapsibleSection
                  title="Content"
                  isOpen={contentOpen}
                  onToggle={() => setContentOpen(!contentOpen)}
                >
                  <CheckboxField
                    label="Hide user questions"
                    checked={hideUserMessages}
                    onChange={setHideUserMessages}
                  />
                  <CheckboxField
                    label="Hide code blocks"
                    checked={hideCodeBlocks}
                    onChange={setHideCodeBlocks}
                  />
                </CollapsibleSection>
              )}

              {/* Layout Options (pdf only, only when no external control) */}
              {showLayoutOptions && (
                <CollapsibleSection
                  title="Layout"
                  isOpen={layoutOpen}
                  onToggle={() => setLayoutOpen(!layoutOpen)}
                >
                  <SelectField
                    label="Page Size"
                    value={pageSize}
                    options={[
                      { value: 'a4', label: 'A4' },
                      { value: 'letter', label: 'Letter' },
                      { value: 'a5', label: 'A5' },
                    ]}
                    onChange={setPageSize}
                  />
                  <SelectField
                    label="Margin"
                    value={margin}
                    options={[
                      { value: 'compact', label: 'Compact' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'wide', label: 'Wide' },
                    ]}
                    onChange={setMargin}
                  />
                </CollapsibleSection>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* Markdown Export */}
              {mode === 'markdown' && (
                <div className="space-y-3">
                  <button
                    onClick={handleCopyMarkdown}
                    className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy as Markdown'}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download .md File
                  </button>
                </div>
              )}

              {/* Image/PDF Export */}
              {(mode === 'image' || mode === 'pdf') && (
                <div className="space-y-3">
                  <button
                    onClick={EXPORT_ACTIONS[mode].handler}
                    disabled={isLoading}
                    className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        {exportProgress ? STAGE_MESSAGES[exportProgress.stage] : 'Exporting...'}
                      </>
                    ) : (
                      <>
                        {EXPORT_ACTIONS[mode].icon}
                        {EXPORT_ACTIONS[mode].label}
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {EXPORT_ACTIONS[mode].description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
