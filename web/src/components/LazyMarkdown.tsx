'use client';

import { lazy, Suspense, memo, useMemo, useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';

// Lazy load the markdown renderer component
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

interface LazyMarkdownProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

// Simple text preview while markdown is loading
const TextPreview = memo(function TextPreview({
  content,
  style,
  className
}: LazyMarkdownProps) {
  // Strip markdown syntax for preview
  const plainText = useMemo(() => {
    return content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '[code]')
      // Remove inline code
      .replace(/`[^`]+`/g, '[code]')
      // Remove LaTeX
      .replace(/\$\$[\s\S]*?\$\$/g, '[math]')
      .replace(/\$[^$]+\$/g, '[math]')
      .replace(/\\\[[\s\S]*?\\\]/g, '[math]')
      .replace(/\\\([\s\S]*?\\\)/g, '[math]')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '[image]')
      // Remove bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Limit length
      .slice(0, 500);
  }, [content]);

  return (
    <div className={className} style={style}>
      <p className="whitespace-pre-wrap">{plainText}</p>
    </div>
  );
});

export const LazyMarkdown = memo(function LazyMarkdown(props: LazyMarkdownProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show text preview on server and during initial hydration
  if (!isClient) {
    return <TextPreview {...props} />;
  }

  return (
    <Suspense fallback={<TextPreview {...props} />}>
      <MarkdownRenderer {...props} />
    </Suspense>
  );
});
