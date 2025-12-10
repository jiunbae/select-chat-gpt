'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type {
  ExportStyleType,
  ExportOptions,
  LetterSpacing,
  LineHeight,
  FontSize,
  MessageGap,
  ContentPadding,
  PageSize,
  Margin,
} from '@/lib/export';

interface StyleContextValue {
  // Style type
  styleType: ExportStyleType;
  setStyleType: (type: ExportStyleType) => void;

  // Text styling
  letterSpacing: LetterSpacing;
  setLetterSpacing: (spacing: LetterSpacing) => void;
  lineHeight: LineHeight;
  setLineHeight: (height: LineHeight) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;

  // Spacing
  messageGap: MessageGap;
  setMessageGap: (gap: MessageGap) => void;
  contentPadding: ContentPadding;
  setContentPadding: (padding: ContentPadding) => void;

  // Content filtering
  hideUserMessages: boolean;
  setHideUserMessages: (hide: boolean) => void;
  hideCodeBlocks: boolean;
  setHideCodeBlocks: (hide: boolean) => void;

  // Layout (PDF)
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  margin: Margin;
  setMargin: (margin: Margin) => void;

  // Helper to get export options
  getExportOptions: () => ExportOptions;
}

const StyleContext = createContext<StyleContextValue | null>(null);

export function StyleProvider({ children }: { children: ReactNode }) {
  const [styleType, setStyleType] = useState<ExportStyleType>('chatgpt');
  const [letterSpacing, setLetterSpacing] = useState<LetterSpacing>('normal');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [messageGap, setMessageGap] = useState<MessageGap>('md');
  const [contentPadding, setContentPadding] = useState<ContentPadding>('md');
  const [hideUserMessages, setHideUserMessages] = useState(false);
  const [hideCodeBlocks, setHideCodeBlocks] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [margin, setMargin] = useState<Margin>('normal');

  const getExportOptions = (): ExportOptions => ({
    letterSpacing,
    lineHeight,
    fontSize,
    messageGap,
    contentPadding,
    hideUserMessages,
    hideCodeBlocks,
    pageSize,
    margin,
  });

  return (
    <StyleContext.Provider
      value={{
        styleType,
        setStyleType,
        letterSpacing,
        setLetterSpacing,
        lineHeight,
        setLineHeight,
        fontSize,
        setFontSize,
        messageGap,
        setMessageGap,
        contentPadding,
        setContentPadding,
        hideUserMessages,
        setHideUserMessages,
        hideCodeBlocks,
        setHideCodeBlocks,
        pageSize,
        setPageSize,
        margin,
        setMargin,
        getExportOptions,
      }}
    >
      {children}
    </StyleContext.Provider>
  );
}

export function useStyleContext() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error('useStyleContext must be used within a StyleProvider');
  }
  return context;
}
