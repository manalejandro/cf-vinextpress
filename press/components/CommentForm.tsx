"use client";

import { useActionState } from "react";
import { submitComment, type CommentFormState } from "../actions/comments";

/**
 * The comment form shared by themes. Progressive-enhancement friendly:
 * it is a plain form driven by a server action, with status feedback via
 * `useActionState`. The `contact_url` field is a honeypot (CSS-hidden).
 */

export interface CommentFormProps {
  postId: number;
  requireNameEmail: boolean;
  currentUser?: { name: string; email: string } | null;
  parentId?: number | null;
}

const initialState: CommentFormState = { ok: false, message: "", approved: false };

export function CommentForm({ postId, requireNameEmail, currentUser, parentId }: CommentFormProps) {
  const [state, formAction, pending] = useActionState(submitComment, initialState);

  if (state.ok && state.message) {
    return (
      <div className="vp-comment-notice" role="status">
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form className="vp-comment-form" action={formAction}>
      <input type="hidden" name="post_id" value={postId} />
      {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
      <p className="vp-comment-hp" aria-hidden="true">
        <label htmlFor={`contact_url_${postId}`}>Leave this field empty</label>
        <input id={`contact_url_${postId}`} type="text" name="contact_url" tabIndex={-1} autoComplete="off" />
      </p>

      {currentUser ? (
        <p className="vp-comment-signed-in">
          Commenting as <strong>{currentUser.name}</strong>
        </p>
      ) : (
        <div className="vp-comment-fields">
          <label className="vp-field">
            <span>
              Name{requireNameEmail ? <em aria-label="required"> *</em> : null}
            </span>
            <input type="text" name="author_name" maxLength={120} autoComplete="name" required={requireNameEmail} />
          </label>
          <label className="vp-field">
            <span>
              Email{requireNameEmail ? <em aria-label="required"> *</em> : null}
            </span>
            <input type="email" name="author_email" maxLength={190} autoComplete="email" required={requireNameEmail} />
          </label>
          <label className="vp-field">
            <span>Website</span>
            <input type="url" name="author_url" maxLength={300} autoComplete="url" placeholder="https://" />
          </label>
        </div>
      )}

      <label className="vp-field">
        <span>Comment</span>
        <textarea name="content" rows={5} maxLength={10000} required placeholder="Share your thoughts…" />
      </label>

      {state.message && !state.ok ? (
        <p className="vp-comment-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="vp-button vp-button-solid" disabled={pending}>
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
