import type { ExportMessage, ExportStyle, ExportStyleType, ExportOptions, BubbleThemeConfig, BubbleHeaderConfig, AvatarConfig } from './types';
import { getExportStyle } from './styles';
import { markdownToHtml } from './markdown-utils';
import { removeCitationsFromHtml } from './sanitize-content';
import { filterMessages } from './renderer';

// SVG icon for ChatGPT/AI assistant avatar
const AI_AVATAR_SVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
</svg>
`;

// Back arrow SVG
const BACK_ARROW_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 18l-6-6 6-6"/>
</svg>
`;

// Default assistant name
const DEFAULT_ASSISTANT_NAME = 'ChatGPT';

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles);
}

// Sanitize HTML for bubble display
// Uses DOMParser to safely parse HTML without executing scripts (XSS protection)
function sanitizeForBubble(html: string, options?: ExportOptions): string {
  const cleanedHtml = removeCitationsFromHtml(html);
  const doc = new DOMParser().parseFromString(cleanedHtml, 'text/html');
  const temp = doc.body;

  // Remove interactive elements
  temp.querySelectorAll('button, [role="button"], .copy-button, svg.icon').forEach(el => el.remove());

  // Remove code blocks if requested
  if (options?.hideCodeBlocks) {
    temp.querySelectorAll('pre').forEach(el => el.remove());
  }

  return temp.innerHTML;
}

// Create avatar element
function createAvatar(
  config: AvatarConfig | undefined
): HTMLDivElement | null {
  if (!config?.show) return null;

  const avatar = document.createElement('div');
  avatar.style.width = config.size;
  avatar.style.height = config.size;
  avatar.style.minWidth = config.size;
  avatar.style.minHeight = config.size;
  avatar.style.borderRadius = '50%';
  avatar.style.backgroundColor = config.backgroundColor || '#ccc';
  avatar.style.display = 'flex';
  avatar.style.alignItems = 'center';
  avatar.style.justifyContent = 'center';
  avatar.style.color = config.iconColor || '#fff';
  avatar.style.flexShrink = '0';
  avatar.innerHTML = AI_AVATAR_SVG;

  return avatar;
}

// Create header (app chrome)
function createBubbleHeader(
  config: BubbleHeaderConfig | undefined,
  avatarConfig: AvatarConfig | undefined,
  title: string,
  style: ExportStyle
): HTMLDivElement | null {
  if (!config) return null;

  const header = document.createElement('div');
  // Apply base header styles from ExportStyle
  applyStyles(header, style.header);
  // Layout styles for header
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '12px';

  // Back button
  if (config.showBackButton) {
    const backBtn = document.createElement('div');
    backBtn.style.display = 'flex';
    backBtn.style.alignItems = 'center';
    backBtn.style.justifyContent = 'center';
    backBtn.innerHTML = BACK_ARROW_SVG;
    header.appendChild(backBtn);
  }

  // Avatar in header (configurable via showAvatar)
  if (config.showAvatar && avatarConfig) {
    const headerAvatar = createAvatar(avatarConfig);
    if (headerAvatar) {
      header.appendChild(headerAvatar);
    }
  }

  // Title
  const titleEl = document.createElement('span');
  titleEl.textContent = title || DEFAULT_ASSISTANT_NAME;
  titleEl.style.fontWeight = '600';
  titleEl.style.fontSize = '17px';
  titleEl.style.flex = '1';
  header.appendChild(titleEl);

  return header;
}

// Style content elements inside bubble
function styleContentElements(
  container: HTMLElement,
  config: BubbleThemeConfig,
  style: ExportStyle,
  isUser: boolean
): void {
  const textColor = isUser ? config.userBubble.textColor : config.assistantBubble.textColor;
  const isLight = isColorLight(isUser ? config.userBubble.backgroundColor : config.assistantBubble.backgroundColor);

  // Paragraphs
  container.querySelectorAll('p').forEach(p => {
    (p as HTMLElement).style.margin = '0 0 8px 0';
    (p as HTMLElement).style.color = textColor;
  });
  container.querySelectorAll('p:last-child').forEach(p => {
    (p as HTMLElement).style.marginBottom = '0';
  });

  // Lists
  container.querySelectorAll('ul, ol').forEach(list => {
    (list as HTMLElement).style.margin = '0 0 8px 0';
    (list as HTMLElement).style.paddingLeft = '20px';
    (list as HTMLElement).style.color = textColor;
  });
  container.querySelectorAll('li').forEach(li => {
    (li as HTMLElement).style.marginBottom = '4px';
  });

  // Links - use theme colors from config
  const linkColor = isLight
    ? (config.linkColorLight || '#0066cc')
    : (config.linkColor || '#58a6ff');
  container.querySelectorAll('a').forEach(a => {
    (a as HTMLElement).style.color = linkColor;
    (a as HTMLElement).style.textDecoration = 'underline';
  });

  // Bold
  container.querySelectorAll('strong, b').forEach(el => {
    (el as HTMLElement).style.fontWeight = '600';
  });

  // Code blocks - use theme styles from ExportStyle
  container.querySelectorAll('pre').forEach(pre => {
    applyStyles(pre as HTMLElement, style.codeBlock);
    // Additional bubble-specific styles
    (pre as HTMLElement).style.margin = '8px 0';
    (pre as HTMLElement).style.whiteSpace = 'pre-wrap';
    (pre as HTMLElement).style.wordBreak = 'break-word';
  });

  // Inline code - use theme styles from ExportStyle
  container.querySelectorAll('code').forEach(code => {
    if (code.parentElement?.tagName !== 'PRE') {
      if (style.inlineCode) {
        applyStyles(code as HTMLElement, style.inlineCode);
      } else {
        // Fallback if inlineCode not defined
        (code as HTMLElement).style.backgroundColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
        (code as HTMLElement).style.padding = '2px 4px';
        (code as HTMLElement).style.borderRadius = '4px';
        (code as HTMLElement).style.fontFamily = 'monospace';
        (code as HTMLElement).style.fontSize = '13px';
      }
    }
  });

  // Blockquotes - use theme colors from config
  const blockquoteBorderColor = isLight
    ? (config.blockquoteBorderColorLight || '#666')
    : (config.blockquoteBorderColor || '#888');
  container.querySelectorAll('blockquote').forEach(bq => {
    (bq as HTMLElement).style.borderLeft = `3px solid ${blockquoteBorderColor}`;
    (bq as HTMLElement).style.paddingLeft = '12px';
    (bq as HTMLElement).style.margin = '8px 0';
    (bq as HTMLElement).style.fontStyle = 'italic';
    (bq as HTMLElement).style.opacity = '0.9';
  });
}

// Helper to determine if a color is light or dark
// Supports hex (#RGB, #RRGGBB), rgb(), and rgba() formats.
// For unsupported formats (color names), returns false as a safe default.
function isColorLight(color: string): boolean {
  let r: number, g: number, b: number;

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    // Support 3-digit hex codes (e.g., #fff -> #ffffff)
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) {
      return false;
    }
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    // Match rgb(r, g, b) or rgba(r, g, b, a)
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!match) {
      return false;
    }
    r = parseInt(match[1], 10);
    g = parseInt(match[2], 10);
    b = parseInt(match[3], 10);
  } else {
    return false;
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Create a single bubble message
function createBubbleMessage(
  message: ExportMessage,
  config: BubbleThemeConfig,
  style: ExportStyle,
  options?: ExportOptions
): HTMLDivElement {
  const isUser = message.role === 'user';
  const bubbleStyle = isUser ? config.userBubble : config.assistantBubble;

  // Message row container
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'flex-end';
  row.style.gap = '8px';
  row.style.marginBottom = config.messageGap;
  row.style.justifyContent = bubbleStyle.alignment === 'right' ? 'flex-end' : 'flex-start';

  // Avatar for assistant (configurable via avatar.location)
  const showAvatarInMessage = !isUser && config.avatar?.show && config.avatar.location === 'message';
  if (showAvatarInMessage) {
    const avatar = createAvatar(config.avatar);
    if (avatar) row.appendChild(avatar);
  }

  // Bubble wrapper (for proper alignment)
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.style.maxWidth = config.bubbleMaxWidth;
  bubbleWrapper.style.display = 'flex';
  bubbleWrapper.style.flexDirection = 'column';
  bubbleWrapper.style.alignItems = bubbleStyle.alignment === 'right' ? 'flex-end' : 'flex-start';

  // Name label for assistant (configurable via showAssistantName)
  if (!isUser && config.showAssistantName) {
    const nameLabel = document.createElement('div');
    nameLabel.textContent = config.assistantName || DEFAULT_ASSISTANT_NAME;
    nameLabel.style.fontSize = '12px';
    nameLabel.style.color = '#555';
    nameLabel.style.marginBottom = '4px';
    nameLabel.style.marginLeft = '4px';
    bubbleWrapper.appendChild(nameLabel);
  }

  // Bubble
  const bubble = document.createElement('div');
  bubble.style.padding = '10px 14px';
  bubble.style.borderRadius = bubbleStyle.borderRadius;
  bubble.style.color = bubbleStyle.textColor;
  bubble.style.fontFamily = config.fontFamily;
  bubble.style.fontSize = config.fontSize;
  bubble.style.lineHeight = config.lineHeight;
  bubble.style.wordBreak = 'break-word';

  // Apply background or gradient
  if (isUser && bubbleStyle.gradient) {
    bubble.style.background = bubbleStyle.gradient;
  } else {
    bubble.style.backgroundColor = bubbleStyle.backgroundColor;
  }

  // Content
  const htmlContent = message.html || markdownToHtml(message.content);
  const sanitized = sanitizeForBubble(htmlContent, options);
  bubble.innerHTML = sanitized;

  // Style content elements using theme styles
  styleContentElements(bubble, config, style, isUser);

  bubbleWrapper.appendChild(bubble);
  row.appendChild(bubbleWrapper);

  return row;
}

// Main export function for bubble layouts
export function createBubbleExportableElement(
  messages: ExportMessage[],
  title: string,
  styleType: ExportStyleType,
  options?: ExportOptions
): HTMLDivElement {
  const style = getExportStyle(styleType, options);

  // Runtime check for bubbleConfig - safer than non-null assertion
  const config = style.bubbleConfig;
  if (!config) {
    console.error('Bubble config is missing for a bubble layout style.');
    return document.createElement('div');
  }

  // Filter messages using shared utility
  const filteredMessages = filterMessages(messages, options);

  // Container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.width = config.containerWidth;
  applyStyles(container, style.container);

  // Header (app chrome)
  const header = createBubbleHeader(config.header, config.avatar, title, style);
  if (header) container.appendChild(header);

  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.style.padding = config.containerPadding;
  messagesArea.style.backgroundColor = config.backgroundColor;
  messagesArea.style.minHeight = '200px';

  filteredMessages.forEach(message => {
    const msgEl = createBubbleMessage(message, config, style, options);
    messagesArea.appendChild(msgEl);
  });

  container.appendChild(messagesArea);

  return container;
}
