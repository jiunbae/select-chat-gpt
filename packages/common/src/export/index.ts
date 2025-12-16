// Types
export type {
  ExportStyleType,
  ExportProgress,
  ExportMessage,
  ExportStyle,
  ExportOptions,
  LetterSpacing,
  LineHeight,
  FontSize,
  FontFamily,
  MessageGap,
  ContentPadding,
  PageSize,
  Margin,
  MarginPreset,
  CustomMargin,
  PdfHeaderFooterOptions,
} from './types';
export { ExportError } from './types';

// Styles
export {
  getChatGPTStyle,
  getCleanDocumentStyle,
  getExportStyle,
  getLetterSpacingValue,
  getLineHeightValue,
  getFontSizeValue,
  getFontFamilyValue,
  getMessageGapValue,
  getContentPaddingValue,
  getMarginValue,
  getMarginCssValue,
  MARGIN_PRESETS,
} from './styles';

// Content sanitization
export {
  removeCitations,
  removeCitationsFromHtml,
} from './sanitize-content';

// Renderer
export {
  createMessageElement,
  createExportableElement,
  filterMessages,
} from './renderer';

// Exporter
export type { RenderOptions } from './exporter';
export {
  renderToCanvas,
  sanitizeFilename,
  downloadAsImage,
  downloadAsPDF,
  exportToImage,
  exportToPDF,
  exportToMarkdown,
  downloadMarkdown,
  htmlToMarkdown,
} from './exporter';
