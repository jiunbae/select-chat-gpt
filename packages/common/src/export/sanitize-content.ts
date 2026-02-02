/**
 * Content sanitization utilities for export
 * Removes ChatGPT-specific citation patterns and other unwanted content
 */

/**
 * ChatGPT citation pattern regex
 * Matches patterns like:
 * - fileciteturn16file3L8-L13
 * - filecite≡turn16file3≡L8-L13≡
 * - Various whitespace/separator variations
 */
const CITATION_REGEX = /filecite[≡\s]*turn\d+file\d+[≡\s]*L\d+-L\d+[≡\s]*/gi;

/**
 * Removes ChatGPT citation patterns from plain text
 * Used for Markdown export and other text-based processing
 *
 * @param text - The text content to sanitize
 * @returns Text with citations removed
 *
 * @example
 * removeCitations('Some text fileciteturn16file3L8-L13 more text')
 * // Returns: 'Some text  more text'
 */
export function removeCitations(text: string): string {
  return text.replace(CITATION_REGEX, '');
}

/**
 * Removes ChatGPT citation patterns from HTML content
 * Used for PDF and Image export
 *
 * @param html - The HTML content to sanitize
 * @returns HTML with citations removed
 *
 * @example
 * removeCitationsFromHtml('<p>Text filecite≡turn16file3≡L8-L13≡</p>')
 * // Returns: '<p>Text </p>'
 */
export function removeCitationsFromHtml(html: string): string {
  return html.replace(CITATION_REGEX, '');
}

/**
 * Options for HTML sanitization
 */
export interface SanitizeHtmlOptions {
  hideCodeBlocks?: boolean;
}

/**
 * Sanitizes HTML content by removing interactive elements and optionally code blocks.
 * Uses DOMParser to safely parse HTML without executing scripts (XSS protection).
 *
 * @param html - The HTML content to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 */
export function sanitizeContentHtml(html: string, options?: SanitizeHtmlOptions): string {
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
