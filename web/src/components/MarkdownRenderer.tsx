'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Extended sanitize schema for KaTeX
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub',
    'mfrac', 'mroot', 'msqrt', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd',
    'annotation', 'svg', 'path', 'line', 'rect', 'g', 'use', 'defs',
    'span', 'div'
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

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  style,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { strict: 'ignore' }],
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema]
        ]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
