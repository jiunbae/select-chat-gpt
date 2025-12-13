import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Convert markdown content to HTML while preserving LaTeX formulas.
 * Used when message.html is empty (server stores content as markdown).
 *
 * LaTeX formulas are wrapped in appropriate elements for KaTeX rendering:
 * - Display math (\[...\]) -> <div class="katex-display">...</div>
 * - Inline math (\(...\)) -> <span class="katex-inline">...</span>
 */
export function markdownToHtml(content: string): string {
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

  // Restore LaTeX blocks - wrap in appropriate elements for KaTeX rendering
  for (const { placeholder, original, isBlock } of latexBlocks) {
    const wrapped = isBlock
      ? `<div class="katex-display">${original}</div>`
      : `<span class="katex-inline">${original}</span>`;
    html = html.replace(placeholder, wrapped);
  }

  return html;
}
