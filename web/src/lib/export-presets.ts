import type { ExportOptions } from '@/lib/export';

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
      fontSize: 'base',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      pageSize: 'a4',
      margin: 'normal',
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
      fontSize: 'sm',
      lineHeight: 'snug',
      letterSpacing: 'normal',
      pageSize: 'a4',
      margin: 'wide',
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
      fontSize: 'lg',
      lineHeight: 'relaxed',
      letterSpacing: 'wide',
      pageSize: 'a4',
      margin: 'wide',
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

export const PRESET_LIST: PdfPreset[] = Object.values(PDF_PRESETS);

export const DEFAULT_PRESET: PresetKey = 'simple';
