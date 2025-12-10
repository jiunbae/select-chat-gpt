import type { ExportStyle, ExportStyleType, ExportOptions, LetterSpacing, LineHeight, FontSize, Margin } from './types';

// Helper functions for style values
export function getLetterSpacingValue(spacing: LetterSpacing): string {
  const values: Record<LetterSpacing, string> = {
    tight: '-0.5px',
    normal: '0',
    wide: '1px',
  };
  return values[spacing];
}

export function getLineHeightValue(height: LineHeight): string {
  const values: Record<LineHeight, string> = {
    compact: '1.4',
    normal: '1.75',
    relaxed: '2.0',
  };
  return values[height];
}

export function getFontSizeValue(size: FontSize): string {
  const values: Record<FontSize, string> = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };
  return values[size];
}

export function getMarginValue(margin: Margin): number {
  const values: Record<Margin, number> = {
    compact: 24,
    normal: 32,
    wide: 48,
  };
  return values[margin];
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

export function getExportStyle(styleType: ExportStyleType, options?: ExportOptions): ExportStyle {
  const baseStyle = styleType === 'chatgpt' ? getChatGPTStyle() : getCleanDocumentStyle();

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

  return baseStyle;
}
