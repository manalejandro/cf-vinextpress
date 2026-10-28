import type { PressContext } from "../context";
import type { Comment, PostWithAuthor } from "../types";
import { renderCommentContent } from "../content/format";
import { formatDate, timeAgo } from "../utils/dates";
import { CommentForm } from "./CommentForm";

/**
 * The default comments template: a flat list plus the shared CommentForm.
 * Deliberately cookie-free so cached pages stay cacheable — the submission
 * action identifies logged-in authors server-side. Themes can replace this
 * entirely by providing their own `Comments` template.
 */

export function Comments({
  press,
  post,
  comments,
}: {
  press: PressContext;
  post: PostWithAuthor;
  comments: Comment[];
}) {
  const open = post.commentStatus === "open";

  return (
    <section className="vp-comments" id="comments">
      <h2 className="vp-comments-title">
        {comments.length === 0
          ? "No comments yet"
          : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </h2>

      {comments.length > 0 ? (
        <ol className="vp-comment-list">
          {comments.map((comment) => (
            <li
              className="vp-comment"
              id={`comment-${comment.id}`}
              key={comment.id}
              data-depth={comment.parentId ? 1 : 0}
            >
              <article>
                <footer className="vp-comment-meta">
                  {comment.authorUrl ? (
                    <a href={comment.authorUrl} rel="nofollow noopener noreferrer" target="_blank">
                      {comment.authorName}
                    </a>
                  ) : (
                    <span className="vp-comment-author">{comment.authorName}</span>
                  )}
                  <time dateTime={comment.createdAt} title={formatDate(comment.createdAt)}>
                    {timeAgo(comment.createdAt)}
                  </time>
                </footer>
                <div
                  className="vp-comment-content"
                  dangerouslySetInnerHTML={{ __html: renderCommentContent(comment.content) }}
                />
              </article>
            </li>
          ))}
        </ol>
      ) : null}

      {open ? (
        <>
          <h3 className="vp-comment-reply-title">Leave a comment</h3>
          <CommentForm postId={post.id} requireNameEmail={press.settings.requireNameEmail} />
        </>
      ) : (
        <p className="vp-comments-closed">Comments are closed for this entry.</p>
      )}
    </section>
  );
}
