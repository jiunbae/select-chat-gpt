'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Message as MessageType } from '@/lib/api';
import { Message } from './Message';
import { StyleControls } from './StyleControls';
import { ExportButton } from './ExportButton';
import { AdUnit } from './AdUnit';
import { StyleProvider, useStyleContext } from './StyleContext';
import { LanguageSelector } from './LanguageSelector';

interface SharePageClientProps {
  share: {
    id: string;
    title: string;
    sourceUrl: string;
    messages: MessageType[];
    createdAt: string;
    viewCount: number;
  };
}

function SharePageContent({ share }: SharePageClientProps) {
  const {
    styleType,
    fontSize,
    fontFamily,
    lineHeight,
    letterSpacing,
    messageGap,
    contentPadding,
    hideUserMessages,
    hideCodeBlocks,
    hideDeselected,
    hideCitations,
    getExportOptions,
  } = useStyleContext();

  // Initialize selectedIds with all message IDs (all selected by default)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(share.messages.map(m => m.id))
  );

  // Toggle selection for a single message
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const formattedDate = new Date(share.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter messages based on hideUserMessages and hideDeselected options (memoized)
  const filteredMessages = useMemo(() => {
    let messages = share.messages;
    if (hideUserMessages) {
      messages = messages.filter((m) => m.role !== 'user');
    }
    if (hideDeselected) {
      messages = messages.filter((m) => selectedIds.has(m.id));
    }
    return messages;
  }, [share.messages, hideUserMessages, hideDeselected, selectedIds]);

  // Select all / Deselect all (based on filtered messages)
  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const filteredIds = filteredMessages.map(m => m.id);
      const allSelected = filteredMessages.length > 0 && filteredIds.every(id => prev.has(id));

      if (allSelected) {
        // Deselect all filtered messages, keep others
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      } else {
        // Select all filtered messages, keep others
        const next = new Set(prev);
        filteredIds.forEach(id => next.add(id));
        return next;
      }
    });
  }, [filteredMessages]);

  // Get selected messages for export (based on filtered messages)
  // When hideDeselected is true, filteredMessages already contains only selected messages
  const selectedMessages = useMemo(() => {
    if (hideDeselected) {
      return filteredMessages;
    }
    return filteredMessages.filter(m => selectedIds.has(m.id));
  }, [filteredMessages, selectedIds, hideDeselected]);

  // Calculate selected count based on filtered messages (reuse selectedMessages)
  const filteredSelectedCount = selectedMessages.length;

  const allSelected = filteredMessages.length > 0 && filteredSelectedCount === filteredMessages.length;

  const isCleanStyle = styleType === 'clean';

  return (
    <main
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: isCleanStyle ? '#ffffff' : '#212121',
        color: isCleanStyle ? '#1f2937' : '#ececec',
      }}
    >
      <header
        className="sticky top-0 z-50 backdrop-blur-sm border-b transition-colors duration-200"
        style={{
          backgroundColor: isCleanStyle ? 'rgba(255,255,255,0.8)' : 'rgba(33,33,33,0.8)',
          borderColor: isCleanStyle ? '#e5e7eb' : '#444444',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Top row: Logo and Language Selector */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              style={{ color: isCleanStyle ? '#1f2937' : '#ffffff' }}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <span className="font-semibold hidden sm:inline">SelectChatGPT</span>
            </Link>

            {/* Actions - responsive layout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Selection controls - hidden on very small screens */}
              <div className="hidden xs:flex items-center gap-2">
                <span
                  className={`text-sm ${isCleanStyle ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {filteredSelectedCount}/{filteredMessages.length}
                </span>
                <button
                  onClick={handleSelectAll}
                  className={`px-2 py-1 text-xs sm:text-sm rounded transition-colors ${
                    isCleanStyle
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {allSelected ? 'Deselect' : 'Select All'}
                </button>
              </div>
              <div
                className={`hidden xs:block h-6 w-px ${isCleanStyle ? 'bg-gray-200' : 'bg-gray-700'}`}
              />
              <ExportButton
                messages={selectedMessages}
                title={share.title}
                sourceUrl={share.sourceUrl}
                styleType={styleType}
                exportOptions={getExportOptions()}
                disabled={filteredSelectedCount === 0}
              />
              {/* View Original - icon only on mobile */}
              <a
                href={share.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                title="View Original"
              >
                <span className="hidden sm:inline">View Original</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <div
                className={`h-6 w-px ${isCleanStyle ? 'bg-gray-200' : 'bg-gray-700'}`}
              />
              <LanguageSelector />
            </div>
          </div>
        </div>
        <StyleControls />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: isCleanStyle ? '#1f2937' : '#ffffff' }}
        >
          {share.title}
        </h1>
        <div
          className="text-sm flex items-center gap-4"
          style={{ color: isCleanStyle ? '#6b7280' : '#9ca3af' }}
        >
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{share.messages.length} messages</span>
          <span>•</span>
          <span>{share.viewCount} views</span>
        </div>
      </div>

      {/* Top Ad */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <AdUnit slot="TOP_AD_SLOT" format="horizontal" className="w-full" />
      </div>

      {/* Messages */}
      <div
        className="border-t"
        style={{ borderColor: isCleanStyle ? '#e5e7eb' : '#444444' }}
      >
        {filteredMessages.length === 0 ? (
          <div
            className="max-w-3xl mx-auto px-4 py-12 text-center"
            style={{ color: isCleanStyle ? '#6b7280' : '#9ca3af' }}
          >
            No messages to display with current filters.
          </div>
        ) : (
          filteredMessages.map((message) => (
            <Message
              key={message.id}
              message={message}
              styleType={styleType}
              fontSize={fontSize}
              fontFamily={fontFamily}
              lineHeight={lineHeight}
              letterSpacing={letterSpacing}
              messageGap={messageGap}
              contentPadding={contentPadding}
              hideCodeBlocks={hideCodeBlocks}
              hideCitations={hideCitations}
              showCheckbox={true}
              isSelected={selectedIds.has(message.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </div>

      {/* Bottom Ad */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AdUnit slot="BOTTOM_AD_SLOT" format="horizontal" className="w-full" />
      </div>

      <footer
        className="border-t py-8"
        style={{ borderColor: isCleanStyle ? '#e5e7eb' : '#444444' }}
      >
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p
            className="text-sm mb-4"
            style={{ color: isCleanStyle ? '#6b7280' : '#9ca3af' }}
          >
            This conversation was shared using SelectChatGPT
          </p>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Get the Extension
          </a>
        </div>
      </footer>
    </main>
  );
}

export function SharePageClient({ share }: SharePageClientProps) {
  return (
    <StyleProvider>
      <SharePageContent share={share} />
    </StyleProvider>
  );
}
