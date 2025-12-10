'use client';

import Link from 'next/link';
import type { Message as MessageType } from '@/lib/api';
import { Message } from './Message';
import { StyleControls } from './StyleControls';
import { ExportButton } from './ExportButton';
import { AdUnit } from './AdUnit';
import { StyleProvider, useStyleContext } from './StyleContext';

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
    lineHeight,
    letterSpacing,
    messageGap,
    contentPadding,
    hideUserMessages,
    hideCodeBlocks,
    getExportOptions,
  } = useStyleContext();

  const formattedDate = new Date(share.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter messages if hideUserMessages is enabled
  const filteredMessages = hideUserMessages
    ? share.messages.filter((m) => m.role !== 'user')
    : share.messages;

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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
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
            <span className="font-semibold">SelectChatGPT</span>
          </Link>

          <div className="flex items-center gap-3">
            <ExportButton
              messages={share.messages}
              title={share.title}
              sourceUrl={share.sourceUrl}
              styleType={styleType}
              exportOptions={getExportOptions()}
            />
            <a
              href={share.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View Original
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
          </div>
        </div>
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

      {/* Style Controls */}
      <StyleControls />

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
              lineHeight={lineHeight}
              letterSpacing={letterSpacing}
              messageGap={messageGap}
              contentPadding={contentPadding}
              hideCodeBlocks={hideCodeBlocks}
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
