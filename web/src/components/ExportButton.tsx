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
} from '@/lib/export';

interface ExportButtonProps {
  messages: Message[];
  title: string;
  sourceUrl: string;
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

export function ExportButton({ messages, title, sourceUrl }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ExportMode>('markdown');
  const [styleType, setStyleType] = useState<ExportStyleType>('chatgpt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    try {
      const markdown = exportToMarkdown(messages, title, sourceUrl);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy markdown');
    }
  };

  const handleDownloadMarkdown = () => {
    const markdown = exportToMarkdown(messages, title, sourceUrl);
    downloadMarkdown(markdown, title);
  };

  const createExportHandler = (
    exportFn: typeof exportToImage,
    errorMessage: string
  ) => async () => {
    setIsLoading(true);
    setError(null);
    setExportProgress(null);

    try {
      await exportFn(messages, title, styleType, setExportProgress);
    } catch (e) {
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

  const handleExportImage = createExportHandler(exportToImage, 'Failed to export image');
  const handleExportPDF = createExportHandler(exportToPDF, 'Failed to export PDF');

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

  const showStyleSelector = mode === 'image' || mode === 'pdf';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
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
