import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

const jsdomWindow = new JSDOM('').window
const purify = DOMPurify(jsdomWindow as unknown as typeof globalThis & typeof window)

purify.setConfig({
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'hr',
    'sup', 'sub', 'mark'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'data-*'
  ],
  ALLOW_DATA_ATTR: true
})

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html)
}

export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}
