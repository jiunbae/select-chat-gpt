import html2canvas from 'html2canvas';
import TurndownService from 'turndown';
import type { ExportMessage, ExportProgress, ExportStyleType, ExportOptions } from './types';
import { ExportError } from './types';
import { createExportableElement, filterMessages } from './renderer';
import {
  getFontSizeValue,
  getFontFamilyValue,
  getLineHeightValue,
  getLetterSpacingValue,
  getMessageGapValue,
  getContentPaddingValue,
} from './styles';

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

// Font name mapping for preloading
const FONT_NAME_MAP: Record<string, string> = {
  'pretendard': 'Pretendard',
  'noto-sans-kr': 'Noto Sans KR',
  'noto-serif-kr': 'Noto Serif KR',
  'ibm-plex-sans-kr': 'IBM Plex Sans KR',
};

// Preload fonts for html2canvas rendering
async function preloadFonts(fontFamily?: string): Promise<void> {
  // Wait for document fonts to be ready
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // Get font name to preload
  const fontName = fontFamily ? FONT_NAME_MAP[fontFamily] : undefined;

  // Force font loading by checking each font
  if (document.fonts && fontName) {
    const weights = ['400', '500', '600', '700'];
    const loadPromises: Promise<FontFace[]>[] = [];

    for (const weight of weights) {
      try {
        loadPromises.push(document.fonts.load(`${weight} 16px "${fontName}"`));
      } catch (err) {
        console.warn(`Failed to load font: ${fontName} (weight: ${weight})`, err);
      }
    }

    await Promise.allSettled(loadPromises);
  }

  // Wait for next frame to ensure fonts are applied to DOM
  await new Promise(resolve => requestAnimationFrame(resolve));
}

export async function renderToCanvas(
  element: HTMLElement,
  options: RenderOptions = {},
  fontFamily?: string
): Promise<HTMLCanvasElement> {
  const {
    scale = 2, // High resolution, large images will be split into multiple files
    useCORS = true,
    backgroundColor = null
  } = options;

  // Temporarily add to DOM (required by html2canvas)
  document.body.appendChild(element);

  try {
    // Preload fonts before rendering
    await preloadFonts(fontFamily);

    // Wait for images to load
    const images = element.querySelectorAll('img');
    if (images.length > 0) {
      await Promise.all(
        Array.from(images).map(img =>
          img.complete ? Promise.resolve() : new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          })
        )
      );
    }

    const canvas = await html2canvas(element, {
      scale,
      useCORS,
      logging: false,
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

function downloadCanvasPart(
  canvas: HTMLCanvasElement,
  filename: string,
  startY: number,
  height: number,
  partNumber?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const partCanvas = document.createElement('canvas');
    partCanvas.width = canvas.width;
    partCanvas.height = height;
    const ctx = partCanvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    ctx.drawImage(canvas, 0, startY, canvas.width, height, 0, 0, canvas.width, height);

    const suffix = partNumber !== undefined ? `_${partNumber}` : '';
    const fullFilename = `${filename}${suffix}.png`;

    partCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('toBlob returned null'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fullFilename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png', 1.0);
  });
}

export async function downloadAsImage(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  try {
    const maxHeight = 16384; // Common browser limit

    if (canvas.height <= maxHeight) {
      // Single image - no splitting needed
      await downloadCanvasPart(canvas, filename, 0, canvas.height);
      return;
    }

    // Split into multiple images
    const totalParts = Math.ceil(canvas.height / maxHeight);

    for (let i = 0; i < totalParts; i++) {
      const startY = i * maxHeight;
      const partHeight = Math.min(maxHeight, canvas.height - startY);

      await downloadCanvasPart(canvas, filename, startY, partHeight, i + 1);

      // Small delay between downloads to prevent browser blocking
      if (i < totalParts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch {
    throw new ExportError('Failed to download image', 'DOWNLOAD_FAILED');
  }
}

function generatePrintStyles(options?: ExportOptions, styleType?: ExportStyleType): string {
  const margin = options?.margin || 'normal';
  const marginValue = margin === 'compact' ? '10mm' : margin === 'wide' ? '25mm' : '15mm';

  // Get style values from options
  const fontSize = getFontSizeValue(options?.fontSize || 'base');
  const lineHeight = getLineHeightValue(options?.lineHeight || 'normal');
  const letterSpacing = getLetterSpacingValue(options?.letterSpacing || 'normal');
  const messageGap = getMessageGapValue(options?.messageGap || 'md');
  const contentPadding = getContentPaddingValue(options?.contentPadding || 'md');

  // Style-specific colors
  const isClean = styleType === 'clean';
  const bgColor = isClean ? '#ffffff' : '#212121';
  const textColor = isClean ? '#1f2937' : '#ececec';
  const titleColor = isClean ? '#1a1a1a' : '#ffffff';
  const subtitleColor = isClean ? '#6b7280' : '#8e8ea0';
  const roleLabelColor = isClean ? '#374151' : '#ececec';
  const borderColor = isClean ? '#e5e7eb' : '#444444';
  const linkColor = '#10a37f';
  // Use selected font family or default based on style type
  const fontFamily = options?.fontFamily
    ? getFontFamilyValue(options.fontFamily, styleType)
    : (isClean
      ? 'Georgia, "Times New Roman", serif'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

  return `
    @media print {
      @page {
        size: ${options?.pageSize || 'A4'};
        margin: ${marginValue};
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: ${bgColor} !important;
    }
    body {
      padding: 20px;
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing};
      background-color: ${bgColor} !important;
      color: ${textColor};
    }
    .export-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 ${contentPadding};
    }
    .export-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${titleColor};
    }
    .export-subtitle {
      font-size: 12px;
      color: ${subtitleColor};
      margin-bottom: 24px;
    }
    .message-wrapper {
      padding: ${messageGap} 0;
      border-bottom: 1px solid ${borderColor};
    }
    .message-wrapper.user {
      background-color: ${isClean ? '#ffffff' : '#212121'};
    }
    .message-wrapper.assistant {
      background-color: ${isClean ? '#f9fafb' : '#1a1a1a'};
    }
    .message-wrapper:last-child {
      border-bottom: none;
    }
    .role-label {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      color: ${roleLabelColor};
    }
    .message-content {
      color: ${textColor};
      padding: 0 ${contentPadding};
    }
    .message-content p {
      margin: 0 0 16px 0;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content pre {
      background-color: ${isClean ? '#1e1e1e' : '#0d0d0d'};
      color: #d4d4d4;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      margin: 16px 0;
    }
    .message-content code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
    }
    .message-content pre code {
      background: transparent;
      padding: 0;
    }
    .message-content code:not(pre code) {
      background-color: ${isClean ? '#f3f4f6' : '#3a3a3a'};
      color: ${isClean ? '#1f2937' : '#d4d4d4'};
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .message-content ul, .message-content ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
    }
    .message-content li {
      margin-bottom: 8px;
    }
    .message-content a {
      color: ${linkColor};
      text-decoration: underline;
    }
    .message-content blockquote {
      border-left: 3px solid ${linkColor};
      padding-left: 16px;
      margin: 16px 0;
      font-style: italic;
      color: ${subtitleColor};
    }
    .message-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    .message-content th, .message-content td {
      border: 1px solid ${borderColor};
      padding: 8px 12px;
      text-align: left;
    }
    .message-content th {
      background-color: ${isClean ? '#f9fafb' : '#2a2a2a'};
      font-weight: 600;
    }
  `;
}

// Get font links for PDF/print export
// Google Fonts URL mapping for PDF export
const GOOGLE_FONT_URL_MAP: Record<string, string> = {
  'noto-sans-kr': 'Noto+Sans+KR',
  'noto-serif-kr': 'Noto+Serif+KR',
  'ibm-plex-sans-kr': 'IBM+Plex+Sans+KR',
};

const PRETENDARD_CDN_URL = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';

function getFontLinks(fontFamily?: string): string {
  const links: string[] = [];
  const googleFontName = fontFamily ? GOOGLE_FONT_URL_MAP[fontFamily] : undefined;

  if (googleFontName) {
    // Google Font가 선택된 경우 해당 폰트만 로드
    links.push('<link rel="preconnect" href="https://fonts.googleapis.com" />');
    links.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />');
    links.push(`<link href="https://fonts.googleapis.com/css2?family=${googleFontName}:wght@400;500;600;700&display=swap" rel="stylesheet" />`);
  } else {
    // 'pretendard' 또는 'system' 글꼴인 경우 Pretendard를 폴백으로 로드
    links.push(`<link rel="stylesheet" href="${PRETENDARD_CDN_URL}" />`);
  }

  return links.join('\n    ');
}

function generatePrintHTML(
  messages: ExportMessage[],
  title: string,
  styleType?: ExportStyleType,
  options?: ExportOptions
): string {
  const filteredMessages = options?.hideUserMessages
    ? messages.filter(m => m.role !== 'user')
    : messages;

  const messagesHTML = filteredMessages.map(msg => {
    let content = msg.html;

    // Remove interactive elements
    const temp = document.createElement('div');
    temp.innerHTML = content;
    temp.querySelectorAll('button, [role="button"], .copy-button, svg.icon').forEach(el => el.remove());

    // Remove code blocks if requested
    if (options?.hideCodeBlocks) {
      temp.querySelectorAll('pre').forEach(el => el.remove());
    }

    content = temp.innerHTML;

    const roleClass = msg.role === 'user' ? 'user' : 'assistant';
    return `
      <div class="message-wrapper ${roleClass}">
        <div class="role-label">${msg.role === 'user' ? 'You' : 'ChatGPT'}</div>
        <div class="message-content">${content}</div>
      </div>
    `;
  }).join('');

  const fontLinks = getFontLinks(options?.fontFamily);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${fontLinks}
      <style>${generatePrintStyles(options, styleType)}</style>
    </head>
    <body>
      <div class="export-container">
        <h1 class="export-title">${title}</h1>
        <div class="export-subtitle">Generated by SelectChatGPT</div>
        ${messagesHTML}
      </div>
    </body>
    </html>
  `;
}

// Wait for fonts to load in a window with timeout fallback
async function waitForFontsInWindow(win: Window, timeoutMs: number = 3000): Promise<void> {
  const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

  const fontsReadyPromise = (async () => {
    try {
      await win.document.fonts?.ready;
    } catch {
      // Font API might fail, but we don't want to reject the promise.
    }
  })();

  await Promise.race([fontsReadyPromise, timeoutPromise]);
}

// Wait for stylesheets to load
async function waitForStylesheets(win: Window): Promise<void> {
  const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2000));

  const linkPromises = Array.from(win.document.querySelectorAll('link[rel="stylesheet"]')).map(link => {
    return new Promise<void>(resolve => {
      const linkEl = link as HTMLLinkElement;
      if (linkEl.sheet) {
        resolve();
      } else {
        linkEl.onload = () => resolve();
        linkEl.onerror = () => resolve();
      }
    });
  });

  await Promise.race([Promise.all(linkPromises), timeoutPromise]);
}

export async function downloadAsPDF(
  messages: ExportMessage[],
  title: string,
  styleType?: ExportStyleType,
  options?: ExportOptions
): Promise<void> {
  try {
    const html = generatePrintHTML(messages, title, styleType, options);

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window. Please allow popups.');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = async () => {
      try {
        // Wait for stylesheets to load
        await waitForStylesheets(printWindow);

        // Wait for fonts to load with timeout
        await waitForFontsInWindow(printWindow, 3000);

        // Additional delay for rendering
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        // If something fails, still try to print
        console.error('Error waiting for styles or fonts, proceeding to print anyway:', e);
      } finally {
        printWindow.print();
        // Close window after print dialog closes (user clicks cancel or finishes)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }
    };
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
  onProgress?.({ stage: 'preparing', progress: 10 });

  const element = createExportableElement(messages, title, styleType, options);

  onProgress?.({ stage: 'rendering', progress: 30 });

  const backgroundColor = getBackgroundColor(styleType);
  const canvas = await renderToCanvas(element, { backgroundColor }, options?.fontFamily);

  onProgress?.({ stage: 'downloading', progress: 90 });

  const filename = sanitizeFilename(title || 'chatgpt-conversation');
  await downloadAsImage(canvas, filename);

  onProgress?.({ stage: 'downloading', progress: 100 });
}

export async function exportToPDF(
  messages: ExportMessage[],
  title: string,
  styleType: ExportStyleType,
  onProgress?: (progress: ExportProgress) => void,
  options?: ExportOptions
): Promise<void> {
  onProgress?.({ stage: 'generating', progress: 30 });

  await downloadAsPDF(messages, title, styleType, options);

  onProgress?.({ stage: 'generating', progress: 100 });
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
