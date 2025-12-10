import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TurndownService from 'turndown';
import type { ExportMessage, ExportProgress, ExportStyleType, ExportOptions, PageSize, Margin } from './types';
import { ExportError } from './types';
import { createExportableElement, filterMessages } from './renderer';
import { getMarginValue } from './styles';

// Get PDF page format from options
function getPDFFormat(pageSize?: PageSize): 'a4' | 'letter' | 'a5' {
  return pageSize || 'a4';
}

// Get PDF margin value from options
function getPDFMargin(margin?: Margin): number {
  return margin ? getMarginValue(margin) / 2.5 : 10; // Convert px to mm approximately
}

// Get background color based on style type
function getBackgroundColor(styleType: ExportStyleType): string {
  return styleType === 'chatgpt' ? '#212121' : '#ffffff';
}

// Create a configured turndown instance for HTML to Markdown conversion
function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Preserve code blocks with language hints
  turndownService.addRule('fencedCodeBlock', {
    filter: (node) => {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild !== null &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: (_content, node) => {
      const codeElement = node.firstChild as HTMLElement;
      const className = codeElement.className || '';
      const languageMatch = className.match(/language-(\w+)/);
      const language = languageMatch ? languageMatch[1] : '';
      const code = codeElement.textContent || '';
      return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    },
  });

  return turndownService;
}

// Convert HTML to Markdown preserving formatting
export function htmlToMarkdown(html: string): string {
  const turndownService = createTurndownService();
  return turndownService.turndown(html);
}

export interface RenderOptions {
  scale?: number;
  useCORS?: boolean;
  backgroundColor?: string | null;
}

export async function renderToCanvas(
  element: HTMLElement,
  options: RenderOptions = {}
): Promise<HTMLCanvasElement> {
  const {
    scale = 2,
    useCORS = true,
    backgroundColor = null
  } = options;

  // Temporarily add to DOM (required by html2canvas)
  document.body.appendChild(element);

  try {
    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Debug: log element dimensions
    console.log('[Export] Element dimensions:', {
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      childCount: element.children.length,
    });

    const canvas = await html2canvas(element, {
      scale,
      useCORS,
      logging: true, // Enable logging for debugging
      backgroundColor,
      // Mitigate CSP issues
      foreignObjectRendering: false,
      // Improve rendering quality
      allowTaint: false,
      // Capture the element's actual dimensions
      width: element.scrollWidth || 800,
      height: element.scrollHeight || 600,
      windowWidth: element.scrollWidth || 800,
      windowHeight: element.scrollHeight || 600,
    });

    console.log('[Export] Canvas dimensions:', {
      width: canvas.width,
      height: canvas.height,
    });

    return canvas;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('memory') || error.message.includes('Memory')) {
        throw new ExportError(
          'Content too large. Try selecting fewer messages.',
          'MEMORY_ERROR'
        );
      }
    }
    throw new ExportError('Failed to render content', 'RENDER_FAILED');
  } finally {
    if (element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9가-힣\s]/gi, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

export function downloadAsImage(canvas: HTMLCanvasElement, filename: string): void {
  try {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  } catch {
    throw new ExportError('Failed to download image', 'DOWNLOAD_FAILED');
  }
}

export async function downloadAsPDF(
  canvas: HTMLCanvasElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    const format = getPDFFormat(options?.pageSize);
    const margin = getPDFMargin(options?.margin);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/png', 1.0);

    let heightLeft = imgHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    // Additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    pdf.save(`${filename}.pdf`);
  } catch {
    throw new ExportError('Failed to generate PDF', 'DOWNLOAD_FAILED');
  }
}

export async function exportToImage(
  messages: ExportMessage[],
  title: string,
  styleType: ExportStyleType,
  onProgress?: (progress: ExportProgress) => void,
  options?: ExportOptions
): Promise<void> {
  console.log('[Export] Starting exportToImage:', {
    messageCount: messages.length,
    title,
    styleType,
    options,
  });

  onProgress?.({ stage: 'preparing', progress: 10 });

  const element = createExportableElement(messages, title, styleType, options);
  console.log('[Export] Created element:', element.outerHTML.slice(0, 500));

  onProgress?.({ stage: 'rendering', progress: 30 });

  const backgroundColor = getBackgroundColor(styleType);
  const canvas = await renderToCanvas(element, { backgroundColor });

  onProgress?.({ stage: 'downloading', progress: 90 });

  const filename = sanitizeFilename(title || 'chatgpt-conversation');
  downloadAsImage(canvas, filename);

  onProgress?.({ stage: 'downloading', progress: 100 });
}

export async function exportToPDF(
  messages: ExportMessage[],
  title: string,
  styleType: ExportStyleType,
  onProgress?: (progress: ExportProgress) => void,
  options?: ExportOptions
): Promise<void> {
  onProgress?.({ stage: 'preparing', progress: 10 });

  const element = createExportableElement(messages, title, styleType, options);

  onProgress?.({ stage: 'rendering', progress: 30 });

  const backgroundColor = getBackgroundColor(styleType);
  const canvas = await renderToCanvas(element, { backgroundColor });

  onProgress?.({ stage: 'generating', progress: 70 });

  const filename = sanitizeFilename(title || 'chatgpt-conversation');
  await downloadAsPDF(canvas, filename, options);

  onProgress?.({ stage: 'downloading', progress: 100 });
}

export function exportToMarkdown(
  messages: ExportMessage[],
  title: string,
  sourceUrl: string,
  options?: ExportOptions
): string {
  // Filter messages based on options
  const filteredMessages = filterMessages(messages, options);

  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> Source: ${sourceUrl}`);
  lines.push(`> Generated by SelectChatGPT`);
  lines.push('');
  lines.push('---');
  lines.push('');

  filteredMessages.forEach((message, index) => {
    const roleLabel = message.role === 'user' ? '**User**' : '**ChatGPT**';
    lines.push(`## ${roleLabel}`);
    lines.push('');
    // Convert HTML to markdown to preserve formatting (bold, italic, code blocks, lists, etc.)
    let markdownContent = htmlToMarkdown(message.html);

    // Remove code blocks if requested
    if (options?.hideCodeBlocks) {
      markdownContent = markdownContent.replace(/```[\s\S]*?```/g, '');
    }

    lines.push(markdownContent);
    lines.push('');

    if (index < filteredMessages.length - 1) {
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
