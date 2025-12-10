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
