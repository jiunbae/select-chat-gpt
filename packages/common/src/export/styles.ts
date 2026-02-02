import type { ExportStyle, ExportStyleType, ExportOptions, ExportLayoutMode, LetterSpacing, LineHeight, FontSize, FontFamily, MessageGap, ContentPadding, MarginPreset, CustomMargin, BubbleThemeConfig } from './types';

// Helper functions for style values
export function getLetterSpacingValue(spacing: LetterSpacing): string {
  const values: Record<LetterSpacing, string> = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  };
  return values[spacing];
}

export function getLineHeightValue(height: LineHeight): string {
  const values: Record<LineHeight, string> = {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  };
  return values[height];
}

export function getFontSizeValue(size: FontSize): string {
  const values: Record<FontSize, string> = {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  };
  return values[size];
}

// Fallback font stacks
const SANS_SERIF_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", Times, serif';

// Instagram gradient for user bubbles
const INSTAGRAM_GRADIENT = 'linear-gradient(to right, #405DE6, #5851DB, #833AB4, #C13584, #E1306C)';

export function getFontFamilyValue(family: FontFamily, styleType: ExportStyleType = 'clean'): string {
  const values: Record<FontFamily, string> = {
    'system': styleType === 'chatgpt'
      ? `"Söhne", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
      : SERIF_FALLBACK,
    'pretendard': `Pretendard, ${SANS_SERIF_FALLBACK}`,
    'noto-sans-kr': `"Noto Sans KR", ${SANS_SERIF_FALLBACK}`,
    'noto-serif-kr': `"Noto Serif KR", ${SERIF_FALLBACK}`,
    'ibm-plex-sans-kr': `"IBM Plex Sans KR", ${SANS_SERIF_FALLBACK}`,
  };
  return values[family];
}

export function getMessageGapValue(gap: MessageGap): string {
  const values: Record<MessageGap, string> = {
    none: '0',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  };
  return values[gap];
}

export function getContentPaddingValue(padding: ContentPadding): string {
  const values: Record<ContentPadding, string> = {
    none: '0',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  };
  return values[padding];
}

// Legacy margin function (returns pixels for image export)
export function getMarginValue(margin: MarginPreset): number {
  const values: Record<string, number> = {
    none: 0,
    minimal: 12,
    compact: 24,
    normal: 32,
    wide: 48,
    'a4-standard': 40,
    custom: 32,
  };
  return values[margin] ?? 32;
}

// Margin preset values in mm (for CSS @page)
export const MARGIN_PRESETS: Record<string, string | CustomMargin> = {
  'none': '0mm',
  'minimal': '5mm',
  'compact': '10mm',
  'normal': '15mm',
  'wide': '25mm',
  'a4-standard': { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
  'custom': '15mm', // Default fallback
};

/**
 * Get CSS margin value from margin preset or custom margin
 * Returns a CSS-compatible margin string (e.g., "15mm" or "20mm 25mm 20mm 25mm")
 */
export function getMarginCssValue(margin: MarginPreset, customMargin?: CustomMargin): string {
  if (margin === 'custom' && customMargin) {
    return `${customMargin.top} ${customMargin.right} ${customMargin.bottom} ${customMargin.left}`;
  }

  const preset = MARGIN_PRESETS[margin];
  if (typeof preset === 'object') {
    return `${preset.top} ${preset.right} ${preset.bottom} ${preset.left}`;
  }

  return preset ?? '15mm';
}

export function getChatGPTStyle(): ExportStyle {
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
    inlineCode: {
      backgroundColor: '#3c3c3c',
      padding: '2px 6px',
      borderRadius: '4px',
      fontFamily: '"Söhne Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '14px',
      color: '#e5e5e5',
    },
  };
}

export function getCleanDocumentStyle(): ExportStyle {
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
    inlineCode: {
      backgroundColor: '#f3f4f6',
      padding: '2px 6px',
      borderRadius: '4px',
      fontFamily: '"SF Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '13px',
      color: '#dc2626',
    },
  };
}

// Helper to get layout mode from style type
export function getLayoutMode(styleType: ExportStyleType): ExportLayoutMode {
  switch (styleType) {
    case 'kakaotalk':
    case 'instagram-dm':
      return 'bubble';
    default:
      return 'document';
  }
}

// Code block style options for bubble themes
interface BubbleCodeBlockStyles {
  codeBlock: Partial<CSSStyleDeclaration>;
  inlineCode: Partial<CSSStyleDeclaration>;
}

// Helper to create ExportStyle from BubbleThemeConfig
// Reduces boilerplate in individual theme functions
function createBubbleExportStyle(
  bubbleConfig: BubbleThemeConfig,
  codeStyles: BubbleCodeBlockStyles
): ExportStyle {
  return {
    layoutMode: 'bubble',
    bubbleConfig,
    container: {
      backgroundColor: bubbleConfig.backgroundColor,
      fontFamily: bubbleConfig.fontFamily,
      padding: '0',
      minWidth: '375px',
      maxWidth: '428px',
      boxSizing: 'border-box',
    },
    header: {
      backgroundColor: bubbleConfig.header?.backgroundColor || '',
      color: bubbleConfig.header?.textColor || '',
      padding: '12px 16px',
      fontSize: '17px',
      fontWeight: '600',
    },
    messageWrapper: {},
    userMessage: {},
    assistantMessage: {},
    roleLabel: {},
    content: {
      fontSize: bubbleConfig.fontSize,
      lineHeight: bubbleConfig.lineHeight,
    },
    codeBlock: codeStyles.codeBlock,
    inlineCode: codeStyles.inlineCode,
  };
}

// KakaoTalk theme style
export function getKakaoTalkStyle(): ExportStyle {
  const bubbleConfig: BubbleThemeConfig = {
    backgroundColor: '#B2C7D9',
    header: {
      backgroundColor: '#FEE500',
      textColor: '#3C1E1E',
      showBackButton: true,
    },
    userBubble: {
      backgroundColor: '#FEE500',
      textColor: '#3C1E1E',
      borderRadius: '16px 16px 4px 16px',
      alignment: 'right',
    },
    assistantBubble: {
      backgroundColor: '#FFFFFF',
      textColor: '#1E1E1E',
      borderRadius: '16px 16px 16px 4px',
      alignment: 'left',
    },
    avatar: {
      show: true,
      size: '36px',
      backgroundColor: '#FEE500',
      iconColor: '#3C1E1E',
      location: 'message',
    },
    fontFamily: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
    fontSize: '15px',
    lineHeight: '1.4',
    messageGap: '8px',
    bubbleMaxWidth: '75%',
    containerPadding: '12px',
    containerWidth: '400px',
    // Content styling colors
    linkColor: '#0066cc',
    linkColorLight: '#0066cc',
    blockquoteBorderColor: '#666',
    blockquoteBorderColorLight: '#666',
    // Assistant display
    showAssistantName: true,
    assistantName: 'ChatGPT',
  };

  return createBubbleExportStyle(bubbleConfig, {
    codeBlock: {
      backgroundColor: '#1e1e1e',
      borderRadius: '8px',
      padding: '12px',
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e5e5e5',
      overflowX: 'auto',
    },
    inlineCode: {
      backgroundColor: '#e8e8e8',
      padding: '2px 4px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '13px',
    },
  });
}

// Instagram DM theme style
export function getInstagramDMStyle(): ExportStyle {
  const bubbleConfig: BubbleThemeConfig = {
    backgroundColor: '#000000',
    header: {
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      showBackButton: true,
      showAvatar: true,
    },
    userBubble: {
      backgroundColor: '#3797F0',
      textColor: '#FFFFFF',
      borderRadius: '22px',
      alignment: 'right',
      gradient: INSTAGRAM_GRADIENT,
    },
    assistantBubble: {
      backgroundColor: '#262626',
      textColor: '#FFFFFF',
      borderRadius: '22px',
      alignment: 'left',
    },
    avatar: {
      show: true,
      size: '32px',
      backgroundColor: '#262626',
      iconColor: '#FFFFFF',
      location: 'header',
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
    messageGap: '4px',
    bubbleMaxWidth: '75%',
    containerPadding: '8px 12px',
    containerWidth: '400px',
    // Content styling colors (dark theme)
    linkColor: '#58a6ff',
    linkColorLight: '#0066cc',
    blockquoteBorderColor: '#888',
    blockquoteBorderColorLight: '#666',
    // Assistant display
    showAssistantName: false,
  };

  const style = createBubbleExportStyle(bubbleConfig, {
    codeBlock: {
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      padding: '12px',
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e5e5e5',
      overflowX: 'auto',
    },
    inlineCode: {
      backgroundColor: '#3a3a3a',
      padding: '2px 4px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e5e5e5',
    },
  });

  // Instagram-specific header style with border
  style.header.borderBottom = '1px solid #262626';

  return style;
}

export function getExportStyle(styleType: ExportStyleType, options?: ExportOptions): ExportStyle {
  let baseStyle: ExportStyle;

  switch (styleType) {
    case 'chatgpt':
      baseStyle = getChatGPTStyle();
      break;
    case 'clean':
      baseStyle = getCleanDocumentStyle();
      break;
    case 'kakaotalk':
      baseStyle = getKakaoTalkStyle();
      break;
    case 'instagram-dm':
      baseStyle = getInstagramDMStyle();
      break;
    default:
      baseStyle = getChatGPTStyle();
  }

  if (!options) {
    return baseStyle;
  }

  // Apply text styling options
  if (options.letterSpacing) {
    baseStyle.content.letterSpacing = getLetterSpacingValue(options.letterSpacing);
  }
  if (options.lineHeight) {
    baseStyle.content.lineHeight = getLineHeightValue(options.lineHeight);
  }
  if (options.fontSize) {
    baseStyle.content.fontSize = getFontSizeValue(options.fontSize);
  }
  if (options.fontFamily) {
    const fontValue = getFontFamilyValue(options.fontFamily, styleType);
    baseStyle.container.fontFamily = fontValue;
    baseStyle.content.fontFamily = fontValue;
  }

  return baseStyle;
}
