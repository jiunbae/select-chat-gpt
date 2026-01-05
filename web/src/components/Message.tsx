"use client";

import { useMemo, memo } from "react";
import ReactMarkdown from "react-markdown";
import type { ExtraProps } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "katex/dist/katex.min.css";
import type { Message as MessageType } from "@/lib/api";

import {
  type ExportStyleType,
  type FontSize,
  type FontFamily,
  type LineHeight,
  type LetterSpacing,
  type MessageGap,
  type ContentPadding,
  getFontSizeValue,
  getFontFamilyValue,
  getLineHeightValue,
  getLetterSpacingValue,
  getMessageGapValue,
  getContentPaddingValue,
} from "@/lib/export";

// Type for code component props in react-markdown
type CodeProps = React.ClassAttributes<HTMLElement> &
  React.HTMLAttributes<HTMLElement> &
  ExtraProps & {
    inline?: boolean;
  };

// Extended sanitize schema to allow KaTeX-generated elements and citation sup tags
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // KaTeX math rendering tags
    'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub',
    'mfrac', 'mroot', 'msqrt', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd',
    'annotation', 'svg', 'path', 'line', 'rect', 'g', 'use', 'defs',
    'span', 'div',
    // Citation superscript tag
    'sup'
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class', 'style'],
    'math': ['xmlns', 'display'],
    'annotation': ['encoding'],
    'svg': ['viewBox', 'width', 'height', 'preserveAspectRatio', 'xmlns'],
    'path': ['d', 'fill', 'stroke'],
    'line': ['x1', 'y1', 'x2', 'y2', 'stroke'],
    'rect': ['x', 'y', 'width', 'height', 'fill', 'stroke'],
    'g': ['transform'],
    'use': ['href', 'xlink:href']
  }
};

interface MessageProps {
  message: MessageType;
  styleType?: ExportStyleType;
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  messageGap?: MessageGap;
  contentPadding?: ContentPadding;
  hideCodeBlocks?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

// Remove code blocks from markdown content
function removeCodeBlocks(content: string): string {
  // Remove fenced code blocks (```...```)
  return content.replace(/```[\s\S]*?```/g, '');
}

// Decode HTML entities that may have been encoded during sanitization
function decodeHtmlEntities(content: string): string {
  if (typeof window === 'undefined') {
    // Server-side: use basic replacement
    return content
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
  // Client-side: use textarea for complete HTML entity decoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = content;
  return textarea.value;
}

// Helper function to process text outside of code blocks (both fenced and inline)
// This prevents corrupting code content when applying text transformations
function processTextOutsideCodeBlocks(content: string, processor: (text: string) => string): string {
  // Match fenced code blocks (```...```), double backtick (`...`), and single backtick (`...`)
  const parts = content.split(/(```[\s\S]*?```|``[\s\S]*?``|`[^`\n]*?`)/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      parts[i] = processor(parts[i]);
    }
  }
  return parts.join('');
}

// Helper function to process text outside of code blocks AND LaTeX blocks
// Used specifically for citation conversion to avoid corrupting math expressions
function processTextOutsideCodeAndLatexBlocks(content: string, processor: (text: string) => string): string {
  // Match fenced code blocks (```...```), double backtick (`...`), single backtick (`...`),
  // and LaTeX delimiters (\[...\] and \(...\))
  const parts = content.split(/(```[\s\S]*?```|``[\s\S]*?``|`[^`\n]*?`|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      parts[i] = processor(parts[i]);
    }
  }
  return parts.join('');
}

// Citation regex pattern - defined outside function to avoid recompilation
// Matches: citeturn0search1, turn0search13, cite[1][13][17]
const CITATION_REGEX = /(?:cite)?turn\d+search(\d+)|cite((?:\[\d+\])+)/g;

// Convert ChatGPT citation patterns to clickable superscript links
// Handles multiple citation formats:
// 1. citeturn0search1turn0search13 → [1][13] (ChatGPT web search citations)
// 2. cite[1][13][17] → [1][13][17] (bracket-style citations)
function convertCitations(content: string): string {
  return processTextOutsideCodeAndLatexBlocks(content, (text) =>
    text.replace(CITATION_REGEX, (_, p1, p2) => {
      if (p1) {
        // Handle citeturn0searchN format
        return `<sup class="citation-link">[${p1}]</sup>`;
      }
      // Handle cite[N][M]... format
      return `<sup class="citation-link">${p2}</sup>`;
    })
  );
}

// Convert LaTeX delimiters from ChatGPT format to standard format
// ChatGPT uses \[...\] and \(...\), remark-math expects $$...$$ and $...$
function convertLatexDelimiters(content: string): string {
  return processTextOutsideCodeBlocks(content, (text) =>
    text
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => `$$${math}$$`)
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => `$${math}$`)
  );
}

export const Message = memo(function Message({
  message,
  styleType = 'chatgpt',
  fontSize = 'base',
  fontFamily = 'pretendard',
  lineHeight = 'normal',
  letterSpacing = 'normal',
  messageGap = 'md',
  contentPadding = 'md',
  hideCodeBlocks = false,
  isSelected = true,
  onToggleSelect,
  showCheckbox = false,
}: MessageProps) {
  const isUser = message.role === "user";
  const isCleanStyle = styleType === 'clean';

  // Dynamic content styles
  const contentStyle = useMemo(() => ({
    fontSize: getFontSizeValue(fontSize),
    lineHeight: getLineHeightValue(lineHeight),
    letterSpacing: getLetterSpacingValue(letterSpacing),
    fontFamily: getFontFamilyValue(fontFamily, styleType),
  }), [fontSize, lineHeight, letterSpacing, fontFamily, styleType]);

  // Dynamic container styles based on styleType
  const containerStyle = useMemo(() => ({
    paddingTop: getMessageGapValue(messageGap),
    paddingBottom: getMessageGapValue(messageGap),
    backgroundColor: isCleanStyle
      ? (isUser ? '#ffffff' : '#f9fafb')
      : (isUser ? '#212121' : '#1a1a1a'), // ChatGPT dark style
  }), [messageGap, isCleanStyle, isUser]);

  // Dynamic inner padding styles
  const innerStyle = useMemo(() => ({
    paddingLeft: getContentPaddingValue(contentPadding),
    paddingRight: getContentPaddingValue(contentPadding),
  }), [contentPadding]);

  // Process content (use raw content for react-markdown)
  const processedContent = useMemo(() => {
    let content = message.content || '';
    // Decode HTML entities first (for backward compatibility with sanitized data)
    content = decodeHtmlEntities(content);
    // Convert ChatGPT citations to clickable links
    content = convertCitations(content);
    // Convert LaTeX delimiters for remark-math compatibility
    content = convertLatexDelimiters(content);
    if (hideCodeBlocks) {
      content = removeCodeBlocks(content);
    }
    return content;
  }, [message.content, hideCodeBlocks]);

  // Style-specific text colors (using inline styles instead of dark: classes)
  const textColor = isCleanStyle ? '#1f2937' : '#ffffff';
  const contentColor = isCleanStyle ? '#374151' : '#e5e7eb';

  // Checkbox style classes (extracted for readability)
  const checkboxClasses = useMemo(() => {
    const base = 'w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer';
    if (isSelected) return `${base} border-primary bg-primary/10`;
    if (isCleanStyle) return `${base} border-gray-300`;
    return `${base} border-gray-500`;
  }, [isSelected, isCleanStyle]);

  return (
    <div style={containerStyle}>
      <div className="max-w-3xl mx-auto px-4" style={innerStyle}>
        <div className="flex gap-4">
          {/* Checkbox for message selection */}
          {showCheckbox && (
            <div className="flex-shrink-0 flex items-start pt-1">
              <button
                onClick={() => onToggleSelect?.(message.id)}
                role="checkbox"
                aria-checked={isSelected}
                className={checkboxClasses}
                aria-label={isSelected ? 'Deselect message' : 'Select message'}
              >
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            </div>
          )}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{
              backgroundColor: isCleanStyle
                ? (isUser ? '#4b5563' : '#1f2937')
                : (isUser ? '#10a37f' : '#19c37d'),
            }}
          >
            {isUser ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997z" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="font-semibold mb-2"
              style={{ color: textColor }}
            >
              {isUser ? "You" : "ChatGPT"}
            </div>
            <div
              className="markdown-content prose prose-sm max-w-none"
              style={{ ...contentStyle, color: contentColor }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[
                  [rehypeKatex, { strict: 'ignore' }],
                  rehypeRaw,
                  [rehypeSanitize, sanitizeSchema]
                ]}
                components={{
                  // Handle code blocks - pass through to let code component handle
                  pre({ children }) {
                    return <>{children}</>;
                  },
                  code(props: CodeProps) {
                    const { node, inline, className, children, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    // Use inline prop if available, fallback to heuristic
                    const isInlineCode = inline ?? (!match && !codeString.includes('\n'));

                    if (!isInlineCode) {
                      return (
                        <SyntaxHighlighter
                          style={isCleanStyle ? oneLight : oneDark}
                          language={match ? match[1] : 'text'}
                          PreTag="div"
                          customStyle={{
                            margin: '1em 0',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      );
                    }

                    // Inline code with Tailwind classes
                    return (
                      <code
                        className={`${isCleanStyle ? 'bg-gray-100 text-red-600' : 'bg-zinc-700 text-gray-200'} px-1.5 py-0.5 rounded text-[0.9em]`}
                        {...rest}
                      >
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
      </div>
    </div>
  );
});
