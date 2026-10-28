"use server";

import { revalidatePath } from "next/cache";
import { getPress } from "../context";
import { CoreHooks } from "../hooks";
import { getPostById } from "../models/posts";
import { insertComment, type NewCommentInput } from "../models/comments";
import { getCurrentUser } from "../auth";

/**
 * Public comment submission, wired to the themed comment forms through
 * `useActionState`. Runs the moderation settings plus the
 * `comment_preprocess` filter chain (where Spam Shield lives).
 */

export interface CommentFormState {
  ok: boolean;
  message: string;
  approved: boolean;
}

const initialState: CommentFormState = { ok: false, message: "", approved: false };

export async function submitComment(
  _prev: CommentFormState | null,
  formData: FormData,
): Promise<CommentFormState> {
  const press = await getPress();

  // Honeypot: bots fill everything, humans never see this field.
  if (String(formData.get("contact_url") ?? "").length > 0) {
    return { ok: true, message: "Thanks! Your comment is awaiting moderation.", approved: false };
  }

  const postId = Number(formData.get("post_id"));
  if (!Number.isInteger(postId)) return { ok: false, message: "Invalid post.", approved: false };
  const post = await getPostById(postId);
  if (!post || post.status !== "publish" || post.commentStatus !== "open") {
    return { ok: false, message: "Comments are closed for this entry.", approved: false };
  }

  const authorName = String(formData.get("author_name") ?? "").trim().slice(0, 120);
  const authorEmail = String(formData.get("author_email") ?? "").trim().slice(0, 190);
  const authorUrl = String(formData.get("author_url") ?? "").trim().slice(0, 300);
  const content = String(formData.get("content") ?? "").trim().slice(0, 10_000);
  const parentId = Number(formData.get("parent_id")) || null;

  if (!content) return { ok: false, message: "Please write a comment before submitting.", approved: false };

  const user = await getCurrentUser();
  if (!user && press.settings.requireNameEmail) {
    if (!authorName) return { ok: false, message: "A name is required to comment.", approved: false };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
      return { ok: false, message: "A valid email address is required (it is never published).", approved: false };
    }
  }
  if (authorUrl && !/^https?:\/\/[^\s]+$/i.test(authorUrl)) {
    return { ok: false, message: "Website must be a full http(s) URL.", approved: false };
  }

  const draft: NewCommentInput = {
    postId: post.id,
    parentId,
    authorName: user?.displayName ?? (authorName || "Anonymous"),
    authorEmail: user?.email ?? authorEmail,
    authorUrl,
    content,
    status: press.settings.commentModeration === "auto" ? "approved" : "pending",
    userId: user?.id ?? null,
  };

  const filtered = (await press.applyFilters(CoreHooks.CommentPreprocess, draft, [post])) as
    | NewCommentInput
    | null
    | undefined;
  if (!filtered) {
    return { ok: false, message: "Your comment could not be accepted.", approved: false };
  }

  const comment = await insertComment(filtered);
  await press.doAction(CoreHooks.CommentSubmitted, [comment, post]);

  if (comment.status === "approved") {
    revalidatePath(await press.permalink(post));
    return { ok: true, message: "Thanks! Your comment is live.", approved: true };
  }
  if (comment.status === "spam") {
    return { ok: false, message: "Your comment was flagged as spam.", approved: false };
  }
  return { ok: true, message: "Thanks! Your comment is awaiting moderation.", approved: false };
}
