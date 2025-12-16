import type { ExportMessage, ExportProgress, ExportStyleType, ExportOptions } from './types';
import { ExportError } from './types';
import { markdownToHtml } from './markdown-utils';
import { createExportableElement, filterMessages } from './renderer';
import { removeCitations, removeCitationsFromHtml } from './sanitize-content';
import {
  getFontSizeValue,
  getFontFamilyValue,
  getLineHeightValue,
  getLetterSpacingValue,
  getMessageGapValue,
  getContentPaddingValue,
  getMarginCssValue,
} from './styles';

// Dynamic imports for heavy libraries - only loaded when actually used
// This reduces initial bundle size by ~400KB (html2canvas) + ~50KB (turndown)
import type TurndownServiceType from 'turndown';

let html2canvasModule: typeof import('html2canvas') | null = null;
let TurndownServiceClass: typeof TurndownServiceType | null = null;

async function getHtml2Canvas(): Promise<typeof import('html2canvas')['default']> {
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas');
  }
  return html2canvasModule.default;
}

async function getTurndownService(): Promise<typeof TurndownServiceType> {
  if (!TurndownServiceClass) {
    const module = await import('turndown');
    TurndownServiceClass = module.default;
  }
  return TurndownServiceClass;
}

// Get background color based on style type
function getBackgroundColor(styleType: ExportStyleType): string {
  return styleType === 'chatgpt' ? '#212121' : '#ffffff';
}

// Create a configured turndown instance for HTML to Markdown conversion
async function createTurndownService(): Promise<TurndownServiceType> {
  const TurndownService = await getTurndownService();
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Preserve code blocks with language hints
  turndownService.addRule('fencedCodeBlock', {
    filter: (node: HTMLElement) => {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild !== null &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: (_content: string, node: HTMLElement) => {
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
export async function htmlToMarkdown(html: string): Promise<string> {
  const turndownService = await createTurndownService();
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

  // Dynamically load html2canvas only when needed
  const html2canvas = await getHtml2Canvas();

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
  const marginValue = getMarginCssValue(options?.margin || 'normal', options?.customMargin);
  const pdfHF = options?.pdfHeaderFooter;

  // Determine if we should hide browser default header/footer
  // When any custom header/footer option is enabled, we use @page margin: 0 approach
  const useCustomHeaderFooter = pdfHF && (
    pdfHF.showDate ||
    pdfHF.showTitle ||
    pdfHF.showPageNumbers ||
    pdfHF.showDomain
  );

  // For custom header/footer, we set @page margin to 0 and use body padding
  const pageMargin = useCustomHeaderFooter ? '0' : marginValue;

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

  // Custom header/footer CSS
  const customHeaderFooterStyles = useCustomHeaderFooter ? `
    .print-header,
    .print-footer {
      position: fixed;
      left: 0;
      right: 0;
      height: 15mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 15mm;
      font-size: 10px;
      color: #666;
      font-family: ${isClean ? 'Georgia, serif' : 'Arial, sans-serif'};
    }
    .print-header {
      top: 0;
    }
    .print-footer {
      bottom: 0;
    }
    .print-header-left,
    .print-footer-left {
      text-align: left;
    }
    .print-header-center,
    .print-footer-center {
      text-align: center;
      flex: 1;
    }
    .print-header-right,
    .print-footer-right {
      text-align: right;
    }
    body {
      padding-top: ${pdfHF?.showDate || pdfHF?.showTitle ? '20mm' : '0'};
      padding-bottom: ${pdfHF?.showPageNumbers || pdfHF?.showDomain ? '20mm' : '0'};
    }
  ` : '';

  return `
    @media print {
      @page {
        size: ${options?.pageSize || 'A4'};
        margin: ${pageMargin};
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
    ${customHeaderFooterStyles}
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
    // Use html if available, otherwise convert markdown content to HTML
    let content = msg.html || markdownToHtml(msg.content);

    // Remove ChatGPT citation patterns
    content = removeCitationsFromHtml(content);

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
  const pdfHF = options?.pdfHeaderFooter;

  // KaTeX auto-render script to render LaTeX formulas
  const katexAutoRenderScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(document.body, {
            delimiters: [
              {left: '\\\\[', right: '\\\\]', display: true},
              {left: '\\\\(', right: '\\\\)', display: false}
            ],
            throwOnError: false
          });
        }
        // Signal that KaTeX rendering is complete
        window.katexReady = true;
      });
    </script>
  `;

  // Generate custom header HTML
  const showHeader = pdfHF?.showDate || pdfHF?.showTitle;
  const headerHTML = showHeader ? `
    <div class="print-header">
      <div class="print-header-left">${pdfHF?.showDate ? new Date().toLocaleDateString() : ''}</div>
      <div class="print-header-center">${pdfHF?.showTitle ? title : ''}</div>
      <div class="print-header-right"></div>
    </div>
  ` : '';

  // Generate custom footer HTML
  const showFooter = pdfHF?.showDomain || pdfHF?.showPageNumbers;
  const domainText = pdfHF?.customDomain || (typeof window !== 'undefined' ? window.location.hostname : 'selectchatgpt.im-si.org');
  const footerHTML = showFooter ? `
    <div class="print-footer">
      <div class="print-footer-left">${pdfHF?.showDomain ? domainText : ''}</div>
      <div class="print-footer-center"></div>
      <div class="print-footer-right">${pdfHF?.showPageNumbers ? '<span class="page-number"></span>' : ''}</div>
    </div>
  ` : '';

  // Branding subtitle (default: hidden)
  const showBranding = pdfHF?.showBranding ?? false;
  const brandingHTML = showBranding ? '<div class="export-subtitle">Generated by SelectChatGPT</div>' : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${fontLinks}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
      ${katexAutoRenderScript}
      <style>${generatePrintStyles(options, styleType)}</style>
    </head>
    <body>
      ${headerHTML}
      ${footerHTML}
      <div class="export-container">
        <h1 class="export-title">${title}</h1>
        ${brandingHTML}
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
    // Never resolves, lets timeout win when Font API fails
    const nonResolvingPromise = new Promise<void>(() => {});

    if (!win.document.fonts) {
      console.warn('Font API is not supported. Relying on timeout.');
      return nonResolvingPromise;
    }
    try {
      await win.document.fonts.ready;
    } catch (err) {
      console.warn('Font API failed. Relying on timeout.', err);
      return nonResolvingPromise;
    }
  })();

  await Promise.race([fontsReadyPromise, timeoutPromise]);
}

// Wait for KaTeX to finish rendering in the print window
async function waitForKatexReady(win: Window, timeoutMs: number = 5000): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkReady = () => {
      // Check if KaTeX has finished rendering (set by our script in the HTML)
      if ((win as Window & { katexReady?: boolean }).katexReady) {
        resolve();
        return;
      }

      // Timeout fallback
      if (Date.now() - startTime > timeoutMs) {
        console.warn('KaTeX rendering timeout, proceeding anyway');
        resolve();
        return;
      }

      // Check again in 100ms
      setTimeout(checkReady, 100);
    };

    checkReady();
  });
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

    // Use a more reliable approach than onload
    // Wait for document to be ready, then wait for fonts and KaTeX
    const waitAndPrint = async () => {
      try {
        // Wait for fonts to load with timeout
        await waitForFontsInWindow(printWindow);

        // Wait for KaTeX to render
        await waitForKatexReady(printWindow);

        // Wait for next paint cycle for rendering
        await new Promise(r => setTimeout(r, 100));
        await new Promise(r => printWindow.requestAnimationFrame(r));
      } catch (e) {
        // If something fails, still try to print
        console.error('Error waiting for styles, fonts, or KaTeX, proceeding to print anyway:', e);
      }

      // Print the document
      printWindow.print();

      // Close window after print dialog closes (user clicks cancel or finishes)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };

    // Use both onload and a fallback timer to ensure print is triggered
    let printTriggered = false;

    const triggerPrint = () => {
      if (printTriggered) return;
      printTriggered = true;
      waitAndPrint();
    };

    // Try onload event
    printWindow.onload = triggerPrint;

    // Fallback: if onload doesn't fire within 1 second, trigger manually
    // This handles the case where document.write() doesn't fire onload
    setTimeout(() => {
      if (!printTriggered && printWindow.document.readyState === 'complete') {
        triggerPrint();
      }
    }, 1000);

    // Additional fallback for slower connections
    setTimeout(() => {
      if (!printTriggered) {
        console.warn('Print trigger timeout, forcing print');
        triggerPrint();
      }
    }, 3000);

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

export async function exportToMarkdown(
  messages: ExportMessage[],
  title: string,
  sourceUrl: string,
  options?: ExportOptions
): Promise<string> {
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

  for (let index = 0; index < filteredMessages.length; index++) {
    const message = filteredMessages[index];
    const roleLabel = message.role === 'user' ? '**User**' : '**ChatGPT**';
    lines.push(`## ${roleLabel}`);
    lines.push('');
    // Convert HTML to markdown to preserve formatting (bold, italic, code blocks, lists, etc.)
    // If html is empty, use content directly (it's already in markdown format)
    let markdownContent = message.html
      ? await htmlToMarkdown(message.html)
      : message.content;

    // Remove ChatGPT citation patterns
    markdownContent = removeCitations(markdownContent);

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
  }

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
