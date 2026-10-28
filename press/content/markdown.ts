import { marked } from "marked";

/**
 * Markdown rendering. Posts store either Markdown (default, the
 * recommended writing format) or raw HTML. `marked` is configured once;
 * it is pure JavaScript and runs unchanged on Workers.
 */

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
});

export function markdownToHtml(markdown: string): string {
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return rendered.trim();
}
