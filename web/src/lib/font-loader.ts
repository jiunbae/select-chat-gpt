/**
 * Dynamic font loader - loads Google Fonts on demand
 * This significantly reduces initial page load by not loading all fonts upfront
 */

export type DynamicFontFamily = 'noto-sans-kr' | 'noto-serif-kr' | 'ibm-plex-sans-kr';

interface FontConfig {
  name: string;
  googleFontName: string;
  weights: string[];
  cssVariable: string;
}

const FONT_CONFIGS: Record<DynamicFontFamily, FontConfig> = {
  'noto-sans-kr': {
    name: 'Noto Sans KR',
    googleFontName: 'Noto+Sans+KR',
    weights: ['400', '500', '600', '700'],
    cssVariable: '--font-noto-sans-kr',
  },
  'noto-serif-kr': {
    name: 'Noto Serif KR',
    googleFontName: 'Noto+Serif+KR',
    weights: ['400', '500', '600', '700'],
    cssVariable: '--font-noto-serif-kr',
  },
  'ibm-plex-sans-kr': {
    name: 'IBM Plex Sans KR',
    googleFontName: 'IBM+Plex+Sans+KR',
    weights: ['400', '500', '600', '700'],
    cssVariable: '--font-ibm-plex-sans-kr',
  },
};

// Track loaded fonts to avoid duplicate loads
const loadedFonts = new Set<DynamicFontFamily>();

/**
 * Dynamically load a Google Font
 * @param fontFamily - The font family identifier
 * @returns Promise that resolves when the font is loaded
 */
export async function loadFont(fontFamily: DynamicFontFamily): Promise<void> {
  // Skip if already loaded
  if (loadedFonts.has(fontFamily)) {
    return;
  }

  const config = FONT_CONFIGS[fontFamily];
  if (!config) {
    console.warn(`Unknown font family: ${fontFamily}`);
    return;
  }

  // Check if link already exists
  const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`);
  if (existingLink) {
    loadedFonts.add(fontFamily);
    return;
  }

  // Create Google Fonts URL
  const weightsParam = config.weights.join(';');
  const fontUrl = `https://fonts.googleapis.com/css2?family=${config.googleFontName}:wght@${weightsParam}&display=swap`;

  return new Promise((resolve, reject) => {
    // Create preconnect links for performance
    if (!document.querySelector('link[href="https://fonts.googleapis.com"]')) {
      const preconnect1 = document.createElement('link');
      preconnect1.rel = 'preconnect';
      preconnect1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement('link');
      preconnect2.rel = 'preconnect';
      preconnect2.href = 'https://fonts.gstatic.com';
      preconnect2.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect2);
    }

    // Create stylesheet link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.dataset.font = fontFamily;

    link.onload = () => {
      loadedFonts.add(fontFamily);

      // Add CSS variable to document
      document.documentElement.style.setProperty(
        config.cssVariable,
        `"${config.name}", var(--font-pretendard), system-ui, sans-serif`
      );

      resolve();
    };

    link.onerror = () => {
      reject(new Error(`Failed to load font: ${config.name}`));
    };

    document.head.appendChild(link);
  });
}

/**
 * Check if a font is already loaded
 */
export function isFontLoaded(fontFamily: DynamicFontFamily): boolean {
  return loadedFonts.has(fontFamily);
}

/**
 * Get the CSS font-family value for a given font
 * Returns a fallback stack if the font isn't loaded yet
 */
export function getFontFamilyStack(fontFamily: DynamicFontFamily | 'pretendard' | 'system'): string {
  switch (fontFamily) {
    case 'pretendard':
      return 'var(--font-pretendard), system-ui, sans-serif';
    case 'system':
      return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'noto-sans-kr':
      return loadedFonts.has('noto-sans-kr')
        ? '"Noto Sans KR", var(--font-pretendard), system-ui, sans-serif'
        : 'var(--font-pretendard), system-ui, sans-serif';
    case 'noto-serif-kr':
      return loadedFonts.has('noto-serif-kr')
        ? '"Noto Serif KR", var(--font-pretendard), Georgia, serif'
        : 'var(--font-pretendard), Georgia, serif';
    case 'ibm-plex-sans-kr':
      return loadedFonts.has('ibm-plex-sans-kr')
        ? '"IBM Plex Sans KR", var(--font-pretendard), system-ui, sans-serif'
        : 'var(--font-pretendard), system-ui, sans-serif';
    default:
      return 'var(--font-pretendard), system-ui, sans-serif';
  }
}
