'use client';

import { useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import type { Message as MessageType } from '@/lib/api';
import type { ExportStyleType } from '@/lib/export';

// Extended sanitize schema
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub',
    'mfrac', 'mroot', 'msqrt', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd',
    'annotation', 'svg', 'path', 'line', 'rect', 'g', 'use', 'defs',
    'span', 'div', 'sup'
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class', 'style'],
  }
};

// Theme configurations
const THEMES = {
  kakaotalk: {
    userBubble: {
      backgroundColor: '#FEE500',
      textColor: '#3C1E1E',
      borderRadius: '16px 16px 4px 16px',
    },
    assistantBubble: {
      backgroundColor: '#FFFFFF',
      textColor: '#1E1E1E',
      borderRadius: '16px 16px 16px 4px',
    },
    avatar: {
      show: true,
      backgroundColor: '#FEE500',
      iconColor: '#3C1E1E',
    },
    showAssistantName: true,
    assistantName: 'ChatGPT',
    assistantNameColor: '#3C1E1E',
    fontFamily: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  },
  'instagram-dm': {
    userBubble: {
      backgroundColor: '#3797F0',
      textColor: '#FFFFFF',
      borderRadius: '22px',
      gradient: 'linear-gradient(to right, #405DE6, #5851DB, #833AB4, #C13584, #E1306C)',
    },
    assistantBubble: {
      backgroundColor: '#262626',
      textColor: '#FFFFFF',
      borderRadius: '22px',
    },
    avatar: {
      show: true,
      backgroundColor: '#262626',
      iconColor: '#FFFFFF',
    },
    showAssistantName: false,
    assistantName: '',
    assistantNameColor: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

// ChatGPT avatar SVG
const AI_AVATAR_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997z" />
  </svg>
);

interface BubbleMessageProps {
  message: MessageType;
  styleType: 'kakaotalk' | 'instagram-dm';
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

export const BubbleMessage = memo(function BubbleMessage({
  message,
  styleType,
  isSelected = true,
  onToggleSelect,
  showCheckbox = false,
}: BubbleMessageProps) {
  const isUser = message.role === 'user';
  const theme = THEMES[styleType];
  const bubbleStyle = isUser ? theme.userBubble : theme.assistantBubble;

  const processedContent = useMemo(() => {
    let content = message.content || '';
    // Basic processing - decode HTML entities
    if (typeof window !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = content;
      content = textarea.value;
    }
    return content;
  }, [message.content]);

  return (
    <div
      className="flex items-end gap-2 px-3 py-1"
      style={{
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Checkbox - only for non-user messages on the left */}
      {showCheckbox && !isUser && (
        <button
          onClick={() => onToggleSelect?.(message.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? 'border-primary bg-primary/10' : 'border-gray-400'
          }`}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}

      {/* Avatar for assistant */}
      {!isUser && theme.avatar.show && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: theme.avatar.backgroundColor,
            color: theme.avatar.iconColor,
          }}
        >
          {AI_AVATAR_SVG}
        </div>
      )}

      {/* Bubble wrapper */}
      <div
        className="flex flex-col max-w-[75%]"
        style={{
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Assistant name */}
        {!isUser && theme.showAssistantName && (
          <span
            className="text-xs mb-1 ml-1"
            style={{ color: theme.assistantNameColor }}
          >
            {theme.assistantName}
          </span>
        )}

        {/* Bubble */}
        <div
          className="px-3 py-2 text-sm break-words"
          style={{
            backgroundColor: bubbleStyle.backgroundColor,
            color: bubbleStyle.textColor,
            borderRadius: bubbleStyle.borderRadius,
            ...(isUser && styleType === 'instagram-dm' && {
              background: 'linear-gradient(to right, #405DE6, #5851DB, #833AB4, #C13584, #E1306C)',
            }),
          }}
        >
          <div className="bubble-content prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[
                [rehypeKatex, { strict: 'ignore' }],
                rehypeRaw,
                [rehypeSanitize, sanitizeSchema]
              ]}
              components={{
                p: ({ children }) => <p className="m-0 mb-1 last:mb-0">{children}</p>,
                pre: ({ children }) => (
                  <pre className="bg-black/20 rounded p-2 my-1 overflow-x-auto text-xs">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return <code className="text-xs">{children}</code>;
                  }
                  return (
                    <code className="bg-black/10 px-1 rounded text-xs">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Checkbox - for user messages on the right */}
      {showCheckbox && isUser && (
        <button
          onClick={() => onToggleSelect?.(message.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? 'border-primary bg-primary/10' : 'border-gray-400'
          }`}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
});
