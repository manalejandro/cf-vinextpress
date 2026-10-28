import { markdownToHtml } from "./markdown";
import type { ContentFormat } from "../types";

/** Text/HTML helpers used by templates, feeds and listings. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toPlainText(content: string, format: ContentFormat): string {
  return stripTags(format === "markdown" ? markdownToHtml(content) : content);
}

/** Line breaks to <br> for untrusted plain-text content (comments). */
export function nl2br(escapedText: string): string {
  return escapedText.replace(/\n/g, "<br>\n");
}

export function renderCommentContent(raw: string): string {
  const withoutTags = raw.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linkified = withoutTags.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g,
    (url) => `<a href="${url}" rel="nofollow noopener noreferrer">${url}</a>`,
  );
  return nl2br(linkified);
}

/** Remove shortcode tokens so excerpts never show bracket syntax. */
export function stripShortcodes(text: string): string {
  return text.replace(/\[[a-zA-Z][\w-]*(?:[^\[\]]*)?\]/g, "").replace(/\[\/[a-zA-Z][\w-]*\]/g, "");
}

export function makeExcerpt(content: string, format: ContentFormat, maxWords = 55): string {
  const text = stripShortcodes(toPlainText(content, format));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function readingTimeMinutes(content: string, format: ContentFormat): number {
  const words = toPlainText(content, format).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Trim a title-ish string to N characters on a word boundary. */
export function truncateWords(value: string, maxWords: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")}…`;
}
