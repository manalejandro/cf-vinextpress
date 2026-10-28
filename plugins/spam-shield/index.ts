import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import type { NewCommentInput } from "../../press/models/comments";

/**
 * Spam Shield — lightweight, dependency-free comment spam heuristics.
 *
 * Runs on `comment_preprocess`: scores the submission and downgrades it
 * to "spam" (or rejects it outright) before anything is stored.
 */

const BLOCKLIST = [
  "casino",
  "poker chips",
  "payday loan",
  "cheap jerseys",
  "replica watches",
  "crypto doubling",
  "seo backlinks",
  "buy instagram",
  "escort",
];

const SUSPICIOUS_TLDS = [".ru/", ".cn/", ".xyz/", ".top/", ".click/"];

interface CommentDraft extends NewCommentInput {
  status?: "approved" | "pending" | "spam" | "trash";
}

export function scoreComment(draft: CommentDraft): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const content = draft.content.toLowerCase();

  const linkCount = (draft.content.match(/https?:\/\//gi) ?? []).length;
  if (linkCount >= 3) {
    score += 40;
    reasons.push(`${linkCount} links`);
  } else if (linkCount >= 1) {
    score += 10;
    reasons.push("contains a link");
  }

  for (const term of BLOCKLIST) {
    if (content.includes(term)) {
      score += 50;
      reasons.push(`blocklist term: ${term}`);
      break;
    }
  }

  for (const tld of SUSPICIOUS_TLDS) {
    if (content.includes(tld) || (draft.authorUrl ?? "").toLowerCase().includes(tld.slice(0, -1))) {
      score += 30;
      reasons.push(`suspicious TLD: ${tld.slice(0, -1)}`);
      break;
    }
  }

  const author = draft.authorName.trim().toLowerCase();
  if (/(https?:\/\/|\.com|\.net|\.org)/.test(author)) {
    score += 30;
    reasons.push("URL in author name");
  }

  if (content.length > 400 && linkCount === 0 && content.split(/\s+/).length < 20) {
    score += 20;
    reasons.push("very long words, little whitespace");
  }

  return { score, reasons };
}

export const spamShield: PluginDefinition = {
  manifest: {
    slug: "spam-shield",
    name: "Spam Shield",
    description:
      "Heuristic comment spam filter: scores link density, blocklist terms and author fields, then marks obvious spam before it is stored.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.addFilter<CommentDraft | null>(CoreHooks.CommentPreprocess, (draft) => {
      if (!draft) return draft;
      // Empty or microscopic comments are rejected outright.
      if (draft.content.trim().length < 2) return null;

      const { score } = scoreComment(draft);
      if (score >= 50) {
        return { ...draft, status: "spam" };
      }
      if (score >= 20 && draft.status === "approved") {
        // Heuristics never let a borderline comment skip moderation.
        return { ...draft, status: "pending" };
      }
      return draft;
    }, 10);
  },
};
