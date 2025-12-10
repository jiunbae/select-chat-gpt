import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Message } from './api';

export type ExportStyleType = 'chatgpt' | 'clean';

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'generating' | 'downloading';
  progress: number;
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

interface ExportStyle {
  container: Partial<CSSStyleDeclaration>;
  header: Partial<CSSStyleDeclaration>;
  messageWrapper: Partial<CSSStyleDeclaration>;
  userMessage: Partial<CSSStyleDeclaration>;
  assistantMessage: Partial<CSSStyleDeclaration>;
  roleLabel: Partial<CSSStyleDeclaration>;
  content: Partial<CSSStyleDeclaration>;
  codeBlock: Partial<CSSStyleDeclaration>;
}

function getChatGPTStyle(): ExportStyle {
  return {
    container: {
      backgroundColor: '#212121',
      color: '#ececf1',
      fontFamily: '"Söhne", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '32px',
      minWidth: '600px',
      maxWidth: '800px',
      boxSizing: 'border-box',
    },
    header: {
      fontSize: '24px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#ececf1',
    },
    messageWrapper: {
      padding: '24px 0',
      borderBottom: '1px solid #444654',
    },
    userMessage: {
      backgroundColor: 'transparent',
    },
    assistantMessage: {
      backgroundColor: 'transparent',
    },
    roleLabel: {
      fontWeight: '600',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#ececf1',
    },
    content: {
      fontSize: '16px',
      lineHeight: '1.75',
      color: '#d1d5db',
    },
    codeBlock: {
      backgroundColor: '#1e1e1e',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: '"Söhne Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '14px',
      overflowX: 'auto',
      margin: '16px 0',
      color: '#e5e5e5',
    },
  };
}

function getCleanDocumentStyle(): ExportStyle {
  return {
    container: {
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      fontFamily: 'Georgia, "Times New Roman", Times, serif',
      padding: '48px 56px',
      minWidth: '600px',
      maxWidth: '800px',
      boxSizing: 'border-box',
    },
    header: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#1a1a1a',
      borderBottom: '2px solid #10a37f',
      paddingBottom: '16px',
    },
    messageWrapper: {
      padding: '20px 0',
      borderBottom: '1px solid #e5e5e5',
    },
    userMessage: {
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px 0',
    },
    assistantMessage: {
      backgroundColor: '#ffffff',
      borderLeft: '4px solid #10a37f',
      paddingLeft: '16px',
      margin: '8px 0',
    },
    roleLabel: {
      fontWeight: '700',
      marginBottom: '12px',
      fontSize: '13px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#6b7280',
    },
    content: {
      fontSize: '16px',
      lineHeight: '1.8',
      color: '#374151',
    },
    codeBlock: {
      backgroundColor: '#f3f4f6',
      borderRadius: '6px',
      padding: '16px',
      fontFamily: '"SF Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '13px',
      overflowX: 'auto',
      margin: '16px 0',
      border: '1px solid #e5e7eb',
      color: '#1f2937',
    },
  };
}

function getExportStyle(styleType: ExportStyleType): ExportStyle {
  return styleType === 'chatgpt' ? getChatGPTStyle() : getCleanDocumentStyle();
}

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles);
}

function sanitizeHTML(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  temp.querySelectorAll('button, [role="button"], .copy-button, svg.icon')
    .forEach(el => el.remove());
  return temp.innerHTML;
}

function createMessageElement(
  message: Message,
  style: ExportStyle
): HTMLDivElement {
  const wrapper = document.createElement('div');
  applyStyles(wrapper, style.messageWrapper);

  const roleStyle = message.role === 'user' ? style.userMessage : style.assistantMessage;
  applyStyles(wrapper, roleStyle);

  const roleLabel = document.createElement('div');
  roleLabel.textContent = message.role === 'user' ? 'You' : 'ChatGPT';
  applyStyles(roleLabel, style.roleLabel);
  wrapper.appendChild(roleLabel);

  const content = document.createElement('div');
  content.innerHTML = sanitizeHTML(message.html);
  applyStyles(content, style.content);

  // Style code blocks
  content.querySelectorAll('pre').forEach(pre => {
    applyStyles(pre as HTMLElement, style.codeBlock);
    const code = pre.querySelector('code');
    if (code) {
      code.style.backgroundColor = 'transparent';
      code.style.padding = '0';
    }
  });

  // Style paragraphs
  content.querySelectorAll('p').forEach(p => {
    (p as HTMLElement).style.margin = '0 0 16px 0';
  });

  // Style lists
  content.querySelectorAll('ul, ol').forEach(list => {
    (list as HTMLElement).style.margin = '0 0 16px 0';
    (list as HTMLElement).style.paddingLeft = '24px';
  });

  wrapper.appendChild(content);
  return wrapper;
}

function createExportableElement(
  messages: Message[],
  title: string,
  styleType: ExportStyleType
): HTMLDivElement {
  const style = getExportStyle(styleType);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  applyStyles(container, style.container);

  // Title
  if (title) {
    const titleEl = document.createElement('h1');
    titleEl.textContent = title;
    applyStyles(titleEl, style.header);
    container.appendChild(titleEl);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Generated by SelectChatGPT';
    subtitle.style.fontSize = '12px';
    subtitle.style.color = styleType === 'chatgpt' ? '#8e8ea0' : '#9ca3af';
    subtitle.style.marginBottom = '24px';
    container.appendChild(subtitle);
  }

  // Messages
  messages.forEach((message, index) => {
    const msgEl = createMessageElement(message, style);
    if (index === messages.length - 1) {
      msgEl.style.borderBottom = 'none';
    }
    container.appendChild(msgEl);
  });

  return container;
}

async function renderToCanvas(element: HTMLElement, backgroundColor: string): Promise<HTMLCanvasElement> {
  document.body.appendChild(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor,
      foreignObjectRendering: false,
      allowTaint: false,
      removeContainer: true,
    });
    return canvas;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('memory')) {
      throw new ExportError('Content too large. Try again later.', 'MEMORY_ERROR');
    }
    throw new ExportError('Failed to render content', 'RENDER_FAILED');
  } finally {
    if (element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  }
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9가-힣\s]/gi, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

export async function exportToImage(
  messages: Message[],
  title: string,
  styleType: ExportStyleType,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  onProgress?.({ stage: 'preparing', progress: 10 });

  const element = createExportableElement(messages, title, styleType);

  onProgress?.({ stage: 'rendering', progress: 30 });

  const backgroundColor = styleType === 'chatgpt' ? '#212121' : '#ffffff';
  const canvas = await renderToCanvas(element, backgroundColor);

  onProgress?.({ stage: 'downloading', progress: 90 });

  const filename = sanitizeFilename(title || 'chatgpt-conversation');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();

  onProgress?.({ stage: 'downloading', progress: 100 });
}

export async function exportToPDF(
  messages: Message[],
  title: string,
  styleType: ExportStyleType,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  onProgress?.({ stage: 'preparing', progress: 10 });

  const element = createExportableElement(messages, title, styleType);

  onProgress?.({ stage: 'rendering', progress: 30 });

  const backgroundColor = styleType === 'chatgpt' ? '#212121' : '#ffffff';
  const canvas = await renderToCanvas(element, backgroundColor);

  onProgress?.({ stage: 'generating', progress: 70 });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  const imgWidth = pageWidth - (margin * 2);
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL('image/png', 1.0);

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - margin * 2);

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);
  }

  const filename = sanitizeFilename(title || 'chatgpt-conversation');
  pdf.save(`${filename}.pdf`);

  onProgress?.({ stage: 'downloading', progress: 100 });
}

export function exportToMarkdown(
  messages: Message[],
  title: string,
  sourceUrl: string
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> Source: ${sourceUrl}`);
  lines.push(`> Generated by SelectChatGPT`);
  lines.push('');
  lines.push('---');
  lines.push('');

  messages.forEach((message, index) => {
    const roleLabel = message.role === 'user' ? '**User**' : '**ChatGPT**';
    lines.push(`## ${roleLabel}`);
    lines.push('');
    lines.push(message.content);
    lines.push('');

    if (index < messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });

  return lines.join('\n');
}

export function downloadMarkdown(markdown: string, title: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
