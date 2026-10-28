import type { Metadata } from "next";
import Link from "next/link";
import { can, getCurrentUser } from "@/press/auth";
import { listComments } from "@/press/models/comments";
import { getPostById } from "@/press/models/posts";
import { db, all, num } from "@/press/db/client";
import { formatDateTime, timeAgo } from "@/press/utils/dates";
import { deleteCommentAction, moderateCommentAction } from "../../actions";
import { ConfirmSubmitButton } from "../../components/confirm-button";
import { AdminPagination, EmptyState, Flash, PageHeader, StatusPill } from "../../components/ui";
import type { CommentStatus } from "@/press/types";

export const metadata: Metadata = { title: "Comments" };

const TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "spam", label: "Spam" },
  { key: "trash", label: "Trash" },
];

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!can(user, "moderate_comments")) {
    return (
      <div>
        <PageHeader title="Comments" />
        <EmptyState title="You do not have permission to moderate comments." />
      </div>
    );
  }

  const statusParam = String(sp.status ?? "all");
  const status = TABS.some((t) => t.key === statusParam) ? statusParam : "all";
  const postId = Number(sp.post ?? 0) || undefined;
  const paged = Math.max(1, Number(sp.paged ?? 1) || 1);

  const [{ comments, total }, statusCounts] = await Promise.all([
    listComments({ status: status as CommentStatus | "all", postId, page: paged, perPage: 20 }),
    all(db().prepare("SELECT status, COUNT(*) AS n FROM vp_comments GROUP BY status"), (row) => ({
      status: String(row.status),
      n: num(row, "n"),
    })).then((rows) => {
      const counts: Record<string, number> = { all: 0, pending: 0, approved: 0, spam: 0, trash: 0 };
      for (const row of rows) {
        counts[row.status] = row.n;
        counts.all += row.n;
      }
      return counts;
    }),
  ]);

  const postIds = [...new Set(comments.map((c) => c.postId))];
  const posts = await Promise.all(postIds.map((id) => getPostById(id)));
  const postById = new Map(posts.filter(Boolean).map((p) => [p!.id, p!]));

  const back = `/admin/comments?status=${status}${postId ? `&post=${postId}` : ""}&paged=${paged}`;

  function moderationForm(commentId: number, next: CommentStatus, label: string, className: string) {
    return (
      <form action={moderateCommentAction} key={`${commentId}-${next}`}>
        <input type="hidden" name="id" value={commentId} />
        <input type="hidden" name="status" value={next} />
        <input type="hidden" name="back" value={back} />
        <button type="submit" className={className}>
          {label}
        </button>
      </form>
    );
  }

  return (
    <div>
      <PageHeader title="Comments" description="Moderation queue — approved comments appear on the site immediately." />

      {sp.deleted ? <Flash tone="warn">Comment deleted.</Flash> : null}

      <div className="mb-4 flex flex-wrap items-center gap-1 text-xs font-medium">
        {TABS.map((tab, i) => (
          <span key={tab.key} className="flex items-center gap-1">
            {i > 0 ? <span className="text-slate-300">|</span> : null}
            <Link
              href={`/admin/comments?status=${tab.key}${postId ? `&post=${postId}` : ""}`}
              className={`rounded px-1.5 py-0.5 ${
                status === tab.key ? "font-bold text-slate-900" : "text-orange-600 hover:text-orange-500"
              }`}
            >
              {tab.label} <span className="text-slate-400">({statusCounts[tab.key] ?? 0})</span>
            </Link>
          </span>
        ))}
        {postId ? (
          <Link href="/admin/comments" className="ml-3 text-slate-400 hover:text-slate-700">
            ✕ clear post filter
          </Link>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {comments.length === 0 ? (
          <EmptyState title="No comments here" description="When readers write, their comments land in this queue." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {comments.map((comment) => {
              const post = postById.get(comment.postId);
              return (
                <li key={comment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-900">{comment.authorName || "Anonymous"}</span>
                      {comment.authorEmail ? (
                        <span className="text-xs text-slate-400">{comment.authorEmail}</span>
                      ) : null}
                      {comment.authorUrl ? (
                        <a
                          href={comment.authorUrl}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline"
                        >
                          {comment.authorUrl.replace(/^https?:\/\//, "").slice(0, 40)}
                        </a>
                      ) : null}
                      <StatusPill status={comment.status} />
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">{comment.content.slice(0, 400)}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {timeAgo(comment.createdAt)} ({formatDateTime(comment.createdAt)})
                      {post ? (
                        <>
                          {" "}· on{" "}
                          <Link href={`/admin/${post.type === "post" ? "posts" : "pages"}/${post.id}`} className="text-orange-600 hover:underline">
                            {post.title || "(untitled)"}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-medium">
                    {comment.status !== "approved" && comment.status !== "trash"
                      ? moderationForm(comment.id, "approved", "Approve", "text-emerald-600 hover:text-emerald-500")
                      : null}
                    {comment.status === "approved"
                      ? moderationForm(comment.id, "pending", "Unapprove", "text-slate-500 hover:text-slate-800")
                      : null}
                    {comment.status !== "spam"
                      ? moderationForm(comment.id, "spam", "Spam", "text-amber-600 hover:text-amber-500")
                      : null}
                    {comment.status !== "trash" ? (
                      moderationForm(comment.id, "trash", "Trash", "text-slate-400 hover:text-red-600")
                    ) : (
                      moderationForm(comment.id, "pending", "Restore", "text-slate-500 hover:text-slate-800")
                    )}
                    <form id={`delete-comment-${comment.id}`} action={deleteCommentAction} className="hidden">
                      <input type="hidden" name="id" value={comment.id} />
                    </form>
                    <ConfirmSubmitButton formId={`delete-comment-${comment.id}`} label="Delete" message="Delete this comment permanently?" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AdminPagination
        page={paged}
        totalPages={Math.max(1, Math.ceil(total / 20))}
        hrefFor={(p) => `/admin/comments?status=${status}${postId ? `&post=${postId}` : ""}&paged=${p}`}
      />
    </div>
  );
}
