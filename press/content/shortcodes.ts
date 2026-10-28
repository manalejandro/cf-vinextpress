/**
 * Shortcode engine.
 *
 * Syntax (a familiar bracket convention):
 *   [name]                       -- bare
 *   [name key="value" flag]      -- attributes
 *   [name key="value"]inner[/name]
 *   [name /]                     -- explicit self-closing
 *
 * Handlers are async: (attrs, innerContent | null, tag) => html string.
 * Unknown shortcodes are left untouched so authors can fix typos later.
 */

export type ShortcodeHandler = (
  attrs: Record<string, string>,
  content: string | null,
  tag: string,
) => string | Promise<string>;

export type ShortcodeRegistry = Map<string, ShortcodeHandler>;

export function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))|([\w-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    if (match[1]) {
      attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
    } else if (match[5]) {
      attrs[match[5]] = "true";
    }
  }
  return attrs;
}

const SHORTCODE_SOURCE =
  String.raw`\[([a-zA-Z][\w-]*)((?:[^\[\]]*|\[[^\[\]]*\])*?)(\/)?\](?:([\s\S]*?)\[\/\1\])?`;

/** Expand every registered shortcode in `content`, depth-first. */
export async function doShortcodes(content: string, registry: ShortcodeRegistry): Promise<string> {
  if (!content.includes("[") || registry.size === 0) return content;

  const MAX_DEPTH = 8;

  async function expand(input: string, depth: number): Promise<string> {
    // A fresh regex per call: a shared /g regex would have its lastIndex
    // reset by nested expansions, re-matching forever.
    const pattern = new RegExp(SHORTCODE_SOURCE, "g");
    let out = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(input)) !== null) {
      const tag = match[1]!.toLowerCase();
      const handler = registry.get(tag);
      if (!handler) continue;
      out += input.slice(lastIndex, match.index);
      const attrs = parseAttrs(match[2] ?? "");
      const inner =
        match[4] !== undefined && depth < MAX_DEPTH ? await expand(match[4], depth + 1) : (match[4] ?? null);
      try {
        out += await handler(attrs, inner, tag);
      } catch {
        out += match[0]; // keep the raw shortcode if the handler blew up
      }
      lastIndex = match.index + match[0].length;
      if (lastIndex >= input.length) break;
    }
    out += input.slice(lastIndex);
    return out;
  }

  return expand(content, 0);
}
