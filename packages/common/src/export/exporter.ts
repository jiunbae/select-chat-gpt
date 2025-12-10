import html2canvas from 'html2canvas';
import TurndownService from 'turndown';
import type { ExportMessage, ExportProgress, ExportStyleType, ExportOptions } from './types';
import { ExportError } from './types';
import { createExportableElement, filterMessages } from './renderer';

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
    scale = 1, // Reduced from 2 to handle large content
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
      console.log(`[Export] Part ${partNumber ?? 1} blob size:`, blob.size);
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
    console.log('[Export] downloadAsImage called, canvas size:', canvas.width, 'x', canvas.height);

    const maxHeight = 16384; // Common browser limit

    if (canvas.height <= maxHeight) {
      // Single image - no splitting needed
      await downloadCanvasPart(canvas, filename, 0, canvas.height);
      return;
    }

    // Split into multiple images
    const totalParts = Math.ceil(canvas.height / maxHeight);
    console.log(`[Export] Canvas too tall, splitting into ${totalParts} parts`);

    for (let i = 0; i < totalParts; i++) {
      const startY = i * maxHeight;
      const partHeight = Math.min(maxHeight, canvas.height - startY);
      console.log(`[Export] Downloading part ${i + 1}/${totalParts}: startY=${startY}, height=${partHeight}`);

      await downloadCanvasPart(canvas, filename, startY, partHeight, i + 1);

      // Small delay between downloads to prevent browser blocking
      if (i < totalParts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[Export] Successfully downloaded ${totalParts} images`);
  } catch (e) {
    console.error('[Export] downloadAsImage error:', e);
    throw new ExportError('Failed to download image', 'DOWNLOAD_FAILED');
  }
}

function generatePrintStyles(options?: ExportOptions): string {
  const margin = options?.margin || 'normal';
  const marginValue = margin === 'compact' ? '10mm' : margin === 'wide' ? '25mm' : '15mm';

  return `
    @media print {
      @page {
        size: ${options?.pageSize || 'A4'};
        margin: ${marginValue};
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
    }
    .export-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .export-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .export-subtitle {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .message-wrapper {
      padding: 16px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .message-wrapper:last-child {
      border-bottom: none;
    }
    .role-label {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      color: #374151;
    }
    .message-content {
      color: #1f2937;
    }
    .message-content p {
      margin: 0 0 16px 0;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content pre {
      background-color: #1e1e1e;
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
      background-color: #f3f4f6;
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
      color: #10a37f;
      text-decoration: underline;
    }
    .message-content blockquote {
      border-left: 3px solid #10a37f;
      padding-left: 16px;
      margin: 16px 0;
      font-style: italic;
      color: #6b7280;
    }
    .message-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    .message-content th, .message-content td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }
    .message-content th {
      background-color: #f9fafb;
      font-weight: 600;
    }
  `;
}

function generatePrintHTML(
  messages: ExportMessage[],
  title: string,
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

    return `
      <div class="message-wrapper">
        <div class="role-label">${msg.role === 'user' ? 'You' : 'ChatGPT'}</div>
        <div class="message-content">${content}</div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>${generatePrintStyles(options)}</style>
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

export async function downloadAsPDF(
  messages: ExportMessage[],
  title: string,
  options?: ExportOptions
): Promise<void> {
  try {
    const html = generatePrintHTML(messages, title, options);

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window. Please allow popups.');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close window after print dialog closes (user clicks cancel or finishes)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 250);
    };
  } catch (e) {
    console.error('[Export] downloadAsPDF error:', e);
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
  await downloadAsImage(canvas, filename);

  onProgress?.({ stage: 'downloading', progress: 100 });
}

export async function exportToPDF(
  messages: ExportMessage[],
  title: string,
  _styleType: ExportStyleType,
  onProgress?: (progress: ExportProgress) => void,
  options?: ExportOptions
): Promise<void> {
  onProgress?.({ stage: 'preparing', progress: 10 });
  onProgress?.({ stage: 'rendering', progress: 30 });
  onProgress?.({ stage: 'generating', progress: 70 });

  await downloadAsPDF(messages, title, options);

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
