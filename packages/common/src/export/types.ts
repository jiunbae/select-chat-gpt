export type ExportStyleType = 'chatgpt' | 'clean';

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'generating' | 'downloading';
  progress: number;
}

export interface ExportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  html: string;
}

export interface ExportStyle {
  container: Partial<CSSStyleDeclaration>;
  header: Partial<CSSStyleDeclaration>;
  messageWrapper: Partial<CSSStyleDeclaration>;
  userMessage: Partial<CSSStyleDeclaration>;
  assistantMessage: Partial<CSSStyleDeclaration>;
  roleLabel: Partial<CSSStyleDeclaration>;
  content: Partial<CSSStyleDeclaration>;
  codeBlock: Partial<CSSStyleDeclaration>;
  inlineCode?: Partial<CSSStyleDeclaration>;
}

export class ExportError extends Error {
  constructor(
    message: string,
    public readonly code: 'RENDER_FAILED' | 'DOWNLOAD_FAILED' | 'MEMORY_ERROR'
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

// Export styling options
export type LetterSpacing = 'tight' | 'normal' | 'wide';
export type LineHeight = 'compact' | 'normal' | 'relaxed';
export type FontSize = 'small' | 'medium' | 'large';
export type PageSize = 'a4' | 'letter' | 'a5';
export type Margin = 'compact' | 'normal' | 'wide';

export interface ExportOptions {
  // Text styling (image/pdf only)
  letterSpacing?: LetterSpacing;
  lineHeight?: LineHeight;
  fontSize?: FontSize;

  // Content filtering (markdown/image/pdf)
  hideUserMessages?: boolean;
  hideCodeBlocks?: boolean;

  // Layout (pdf only)
  pageSize?: PageSize;
  margin?: Margin;
}
