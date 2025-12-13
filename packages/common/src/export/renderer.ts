import { marked } from 'marked';
import type { ExportMessage, ExportStyle, ExportStyleType, ExportOptions } from './types';
import { getExportStyle } from './styles';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Convert markdown content to HTML
// Used when message.html is empty (server stores content as markdown)
// Note: LaTeX formulas are preserved for rendering
function markdownToHtml(content: string): string {
  if (!content) return '';

  // marked doesn't handle LaTeX, so we need to protect LaTeX blocks before parsing
  // and restore them after. We use unique placeholders.
  const latexBlocks: { placeholder: string; original: string; isBlock: boolean }[] = [];
  let placeholderIndex = 0;

  // Protect display math: \[...\]
  let processed = content.replace(/\\\[([\s\S]+?)\\\]/g, (match) => {
    const placeholder = `%%LATEX_BLOCK_${placeholderIndex++}%%`;
    latexBlocks.push({ placeholder, original: match, isBlock: true });
    return placeholder;
  });

  // Protect inline math: \(...\)
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (match) => {
    const placeholder = `%%LATEX_INLINE_${placeholderIndex++}%%`;
    latexBlocks.push({ placeholder, original: match, isBlock: false });
    return placeholder;
  });

  // Parse markdown
  let html = marked.parse(processed);
  if (typeof html !== 'string') html = '';

  // Restore LaTeX blocks - wrap in spans for potential KaTeX rendering
  for (const { placeholder, original, isBlock } of latexBlocks) {
    const wrapped = isBlock
      ? `<div class="katex-display">${original}</div>`
      : `<span class="katex-inline">${original}</span>`;
    html = html.replace(placeholder, wrapped);
  }

  return html;
}

// Filter messages based on export options
export function filterMessages(messages: ExportMessage[], options?: ExportOptions): ExportMessage[] {
  if (!options) return messages;

  let filtered = messages;

  // Filter out user messages if requested
  if (options.hideUserMessages) {
    filtered = filtered.filter(m => m.role !== 'user');
  }

  return filtered;
}

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles);
}

// Remove interactive elements that should not be in the exported output.
// This is not a security sanitizer.
function sanitizeHTML(html: string, options?: ExportOptions): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  temp.querySelectorAll('button, [role="button"], .copy-button, svg.icon')
    .forEach(el => el.remove());

  // Remove code blocks if requested
  if (options?.hideCodeBlocks) {
    temp.querySelectorAll('pre').forEach(el => el.remove());
  }

  return temp.innerHTML;
}

function processCodeBlocks(container: HTMLElement, style: ExportStyle, options?: ExportOptions): void {
  // Skip processing if code blocks are hidden
  if (options?.hideCodeBlocks) {
    return;
  }

  // Style pre > code blocks
  container.querySelectorAll('pre').forEach(pre => {
    applyStyles(pre as HTMLElement, style.codeBlock);
    const code = pre.querySelector('code');
    if (code) {
      code.style.backgroundColor = 'transparent';
      code.style.padding = '0';
    }
  });

  // Style inline code (not inside pre)
  if (style.inlineCode) {
    container.querySelectorAll('code').forEach(code => {
      if (code.parentElement?.tagName !== 'PRE') {
        applyStyles(code as HTMLElement, style.inlineCode!);
      }
    });
  }
}

export function createMessageElement(
  message: ExportMessage,
  style: ExportStyle,
  options?: ExportOptions
): HTMLDivElement {
  const wrapper = document.createElement('div');
  applyStyles(wrapper, style.messageWrapper);

  // Apply role-specific styles
  const roleStyle = message.role === 'user' ? style.userMessage : style.assistantMessage;
  applyStyles(wrapper, roleStyle);

  // Role label
  const roleLabel = document.createElement('div');
  roleLabel.textContent = message.role === 'user' ? 'You' : 'ChatGPT';
  applyStyles(roleLabel, style.roleLabel);
  wrapper.appendChild(roleLabel);

  // Content
  const content = document.createElement('div');
  // Use html if available, otherwise convert markdown content to HTML
  const htmlContent = message.html || markdownToHtml(message.content);
  content.innerHTML = sanitizeHTML(htmlContent, options);
  applyStyles(content, style.content);

  // Process code blocks inside content
  processCodeBlocks(content, style, options);

  // Style other elements
  content.querySelectorAll('p').forEach(p => {
    (p as HTMLElement).style.margin = '0 0 16px 0';
  });
  content.querySelectorAll('ul, ol').forEach(list => {
    (list as HTMLElement).style.margin = '0 0 16px 0';
    (list as HTMLElement).style.paddingLeft = '24px';
  });
  content.querySelectorAll('li').forEach(li => {
    (li as HTMLElement).style.marginBottom = '8px';
  });
  content.querySelectorAll('a').forEach(a => {
    (a as HTMLElement).style.color = '#10a37f';
    (a as HTMLElement).style.textDecoration = 'underline';
  });
  content.querySelectorAll('strong, b').forEach(el => {
    (el as HTMLElement).style.fontWeight = '600';
  });
  content.querySelectorAll('blockquote').forEach(bq => {
    (bq as HTMLElement).style.borderLeft = '3px solid #10a37f';
    (bq as HTMLElement).style.paddingLeft = '16px';
    (bq as HTMLElement).style.margin = '16px 0';
    (bq as HTMLElement).style.fontStyle = 'italic';
    (bq as HTMLElement).style.color = '#6b7280';
  });

  wrapper.appendChild(content);

  return wrapper;
}

export function createExportableElement(
  messages: ExportMessage[],
  title: string,
  styleType: ExportStyleType,
  options?: ExportOptions
): HTMLDivElement {
  const style = getExportStyle(styleType, options);

  // Filter messages based on options
  const filteredMessages = filterMessages(messages, options);

  const container = document.createElement('div');
  // Position off-screen but still renderable by html2canvas
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.opacity = '1'; // Must be visible for html2canvas
  container.style.pointerEvents = 'none';
  applyStyles(container, style.container);

  // Title
  if (title) {
    const titleEl = document.createElement('h1');
    titleEl.textContent = title;
    applyStyles(titleEl, style.header);
    container.appendChild(titleEl);

    // Subtitle with source info
    const subtitle = document.createElement('div');
    subtitle.textContent = 'Generated by SelectChatGPT';
    subtitle.style.fontSize = '12px';
    subtitle.style.color = styleType === 'chatgpt' ? '#8e8ea0' : '#9ca3af';
    subtitle.style.marginBottom = '24px';
    container.appendChild(subtitle);
  }

  // Messages
  filteredMessages.forEach((message, index) => {
    const msgEl = createMessageElement(message, style, options);
    if (index === filteredMessages.length - 1) {
      msgEl.style.borderBottom = 'none';
    }
    container.appendChild(msgEl);
  });

  return container;
}
