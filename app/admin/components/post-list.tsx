import Link from "next/link";
import type { PostWithAuthor, User } from "@/press/types";
import { can } from "@/press/auth";
import { formatDate } from "@/press/utils/dates";
import { deletePostAction, restorePostAction, trashPostAction } from "../actions";
import { ConfirmSubmitButton } from "./confirm-button";
import { AdminPagination, EmptyState, StatusPill, Td, Th } from "./ui";

/** Shared list table for posts and pages in the dashboard. */

const TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "publish", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "private", label: "Private" },
  { key: "trash", label: "Trash" },
];

export interface PostListProps {
  type: "post" | "page";
  posts: PostWithAuthor[];
  counts: Record<string, number>;
  commentCounts?: Record<number, number>;
  activeStatus: string;
  search: string;
  page: number;
  totalPages: number;
  user: User;
  viewUrlFor: (post: PostWithAuthor) => string;
}

export function PostList({
  type,
  posts,
  counts,
  commentCounts,
  activeStatus,
  search,
  page,
  totalPages,
  user,
  viewUrlFor,
}: PostListProps) {
  const base = type === "post" ? "/admin/posts" : "/admin/pages";
  const label = type === "post" ? "post" : "page";

  const hrefFor = (params: { status?: string; s?: string; paged?: number }): string => {
    const sp = new URLSearchParams();
    if (params.status && params.status !== "all") sp.set("status", params.status);
    if (params.s) sp.set("s", params.s);
    if (params.paged && params.paged > 1) sp.set("paged", String(params.paged));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-1 text-xs font-medium">
          {TABS.map((tab, i) => (
            <li key={tab.key} className="flex items-center gap-1">
              {i > 0 ? <span className="text-slate-300">|</span> : null}
              <Link
                href={hrefFor({ status: tab.key, s: search })}
                className={`rounded px-1.5 py-0.5 ${
                  activeStatus === tab.key ? "font-bold text-slate-900" : "text-orange-600 hover:text-orange-500"
                }`}
              >
                {tab.label}
                {counts[tab.key] !== undefined ? <span className="ml-1 text-slate-400">({counts[tab.key]})</span> : null}
              </Link>
            </li>
          ))}
        </ul>

        <form method="GET" action={base} className="flex items-center gap-2">
          {activeStatus !== "all" ? <input type="hidden" name="status" value={activeStatus} /> : null}
          <input
            type="search"
            name="s"
            defaultValue={search}
            placeholder={`Search ${label}s…`}
            className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-sm outline-none focus:border-orange-500"
          />
          <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Search
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {posts.length === 0 ? (
          <EmptyState
            title={`No ${label}s found`}
            description={search ? `Nothing matches “${search}”.` : `Nothing here yet.`}
            action={
              <Link href={`${base}/new`} className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-500">
                + New {label}
              </Link>
            }
          />
        ) : (
          <table className="w-full border-collapse">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>Title</Th>
                <Th className="hidden md:table-cell">Author</Th>
                {type === "post" ? <Th className="hidden lg:table-cell">Comments</Th> : null}
                <Th className="hidden sm:table-cell">Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/70">
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link href={`${base}/${post.id}`} className="font-semibold text-slate-900 hover:text-orange-600">
                        {post.title || "(untitled)"}
                      </Link>
                      {post.status !== "publish" ? <StatusPill status={post.status} /> : null}
                    </div>
                    <p className="vp-font-mono mt-0.5 text-[11px] text-slate-400">/{post.slug}</p>
                  </Td>
                  <Td className="hidden md:table-cell">{post.authorName}</Td>
                  {type === "post" ? (
                    <Td className="hidden lg:table-cell">
                      <Link href={`/admin/comments?post=${post.id}`} className="hover:text-orange-600">
                        {commentCounts?.[post.id] ?? 0}
                      </Link>
                    </Td>
                  ) : null}
                  <Td className="hidden whitespace-nowrap text-slate-500 sm:table-cell">
                    {formatDate(post.publishedAt ?? post.createdAt, "short")}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <Link href={`${base}/${post.id}`} className="font-semibold text-orange-600 hover:text-orange-500">
                        Edit
                      </Link>
                      {post.status === "publish" ? (
                        <Link href={viewUrlFor(post)} target="_blank" className="text-slate-500 hover:text-slate-800">
                          View
                        </Link>
                      ) : null}
                      {post.status !== "trash" && can(user, "edit_posts") ? (
                        <form action={trashPostAction}>
                          <input type="hidden" name="id" value={post.id} />
                          <button type="submit" className="text-slate-400 hover:text-red-600">
                            Trash
                          </button>
                        </form>
                      ) : null}
                      {post.status === "trash" ? (
                        <>
                          <form action={restorePostAction}>
                            <input type="hidden" name="id" value={post.id} />
                            <button type="submit" className="text-slate-400 hover:text-emerald-600">
                              Restore
                            </button>
                          </form>
                          {can(user, "edit_others_posts") ? (
                            <>
                              <form id={`delete-${type}-${post.id}`} action={deletePostAction} className="hidden">
                                <input type="hidden" name="id" value={post.id} />
                              </form>
                              <ConfirmSubmitButton formId={`delete-${type}-${post.id}`} label="Delete" />
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor({ status: activeStatus, s: search, paged: p })} />
    </div>
  );
}
