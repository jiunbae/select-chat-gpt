import type {
  ExportOptions,
  FontSize,
  LineHeight,
  LetterSpacing,
  MarginPreset,
  PageSize,
} from '@/lib/export';

export type PresetKey = 'simple' | 'document' | 'print';

export interface PdfPreset {
  key: PresetKey;
  name: string;
  description: string;
  options: ExportOptions;
}

/**
 * PDF Export Presets
 *
 * - simple: Quick export with default settings (most common use case)
 * - document: Optimized for digital documents, smaller font for more content
 * - print: Optimized for printing, larger font and wider margins
 */
export const PDF_PRESETS: Record<PresetKey, PdfPreset> = {
  simple: {
    key: 'simple',
    name: '간편',
    description: '기본 설정으로 빠르게 내보내기',
    options: {
      fontSize: 'base' as FontSize,
      lineHeight: 'normal' as LineHeight,
      letterSpacing: 'normal' as LetterSpacing,
      pageSize: 'a4' as PageSize,
      margin: 'normal' as MarginPreset,
      hideUserMessages: false,
      hideCodeBlocks: false,
      pdfHeaderFooter: {
        showPageNumbers: true,
        showBranding: false,
        showDate: false,
        showTitle: false,
        showDomain: false,
      },
    },
  },
  document: {
    key: 'document',
    name: '문서용',
    description: '디지털 문서에 최적화, 작은 폰트',
    options: {
      fontSize: 'sm' as FontSize,
      lineHeight: 'snug' as LineHeight,
      letterSpacing: 'normal' as LetterSpacing,
      pageSize: 'a4' as PageSize,
      margin: 'wide' as MarginPreset,
      hideUserMessages: false,
      hideCodeBlocks: false,
      pdfHeaderFooter: {
        showPageNumbers: true,
        showBranding: false,
        showDate: true,
        showTitle: true,
        showDomain: false,
      },
    },
  },
  print: {
    key: 'print',
    name: '인쇄용',
    description: '인쇄에 최적화, 큰 폰트와 넓은 여백',
    options: {
      fontSize: 'lg' as FontSize,
      lineHeight: 'relaxed' as LineHeight,
      letterSpacing: 'wide' as LetterSpacing,
      pageSize: 'a4' as PageSize,
      margin: 'wide' as MarginPreset,
      hideUserMessages: false,
      hideCodeBlocks: false,
      pdfHeaderFooter: {
        showPageNumbers: true,
        showBranding: false,
        showDate: true,
        showTitle: true,
        showDomain: true,
      },
    },
  },
};

export const PRESET_LIST: PdfPreset[] = [
  PDF_PRESETS.simple,
  PDF_PRESETS.document,
  PDF_PRESETS.print,
];

export const DEFAULT_PRESET: PresetKey = 'simple';
