import Link from "next/link";
import type { ReactNode } from "react";
import type { MediaItem, PostWithAuthor, TermWithCount, User } from "@/press/types";
import { can } from "@/press/auth";
import type { PressContext } from "@/press/context";
import { CoreHooks } from "@/press/hooks";
import { savePostAction, trashPostAction } from "../actions";
import { ContentEditor, TitleSlugFields } from "./editor";
import { BTN_ACCENT, BTN_SECONDARY, INPUT, LABEL } from "./ui";

/**
 * The post/page editor form. One <form> wired to the savePostAction
 * server action; client components power the slug suggestion and the
 * Markdown preview tab.
 */

export interface PostEditorProps {
  type: "post" | "page";
  post?: PostWithAuthor | null;
  categories: TermWithCount[];
  media: MediaItem[];
  parentPages: Array<Pick<PostWithAuthor, "id" | "title" | "slug">>;
  permalinkHint: string;
  user: User;
  postTerms?: { categories: number[]; tags: string[] };
  /** Public URL of the post when published (computed by the caller). */
  viewUrl?: string | null;
  press: PressContext;
}

export async function PostEditor({
  type,
  post,
  categories,
  media,
  parentPages,
  permalinkHint,
  user,
  postTerms,
  viewUrl,
  press,
}: PostEditorProps) {
  const canPublish = can(user, "publish_posts");
  const isPage = type === "page";

  // Plugins (SEO boxes, custom fields…) contribute extra editor fields.
  const extraFieldNodes = await press.applyFilters<ReactNode[]>(CoreHooks.AdminEditorFields, [], [
    { post: post ?? null, type, press },
  ]);
  const extraFields =
    extraFieldNodes.length > 0 ? (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-800">Extended fields</p>
        <div className="grid gap-4 sm:grid-cols-2">{extraFieldNodes}</div>
      </div>
    ) : null;
  const status = post?.status ?? "draft";
  const submitLabel = !post
    ? canPublish
      ? "Publish"
      : "Save draft"
    : status === "publish"
      ? "Update"
      : canPublish
        ? "Publish"
        : "Save draft";

  return (
    <>
    <form action={savePostAction} className="flex flex-col gap-6">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-5">
          <TitleSlugFields
            title={post?.title ?? ""}
            slug={post?.slug ?? ""}
            permalinkHint={permalinkHint}
          />

          <ContentEditor name="content" initialValue={post?.content ?? ""} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={LABEL}>Excerpt</span>
              <textarea
                name="excerpt"
                rows={3}
                maxLength={1000}
                defaultValue={post?.excerpt ?? ""}
                placeholder="A short summary for listings, feeds and social cards. Auto-generated when empty."
                className={INPUT}
              />
            </label>
            <label>
              <span className={LABEL}>Content format</span>
              <select name="content_format" defaultValue={post?.contentFormat ?? "markdown"} className={INPUT}>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
              <span className="mt-1.5 block text-[11px] text-slate-400">
                Markdown is rendered at the edge; HTML is published as authored.
              </span>
            </label>
          </div>

          {extraFields}

          {!isPage ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <fieldset>
                  <legend className={LABEL}>Categories</legend>
                  <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="categories"
                          value={category.id}
                          defaultChecked={postTerms?.categories.includes(category.id) ?? false}
                          className="h-4 w-4 rounded border-slate-300 accent-orange-600"
                        />
                        {category.name}
                        <span className="text-xs text-slate-400">({category.count})</span>
                      </label>
                    ))}
                    {categories.length === 0 ? (
                      <p className="text-sm text-slate-400">No categories yet — add one below.</p>
                    ) : null}
                  </div>
                  <input
                    name="new_categories"
                    placeholder="+ Add categories (comma separated)"
                    className={`${INPUT} mt-3`}
                  />
                </fieldset>
                <label className="self-start">
                  <span className={LABEL}>Tags</span>
                  <input
                    name="tags"
                    defaultValue={postTerms?.tags.join(", ") ?? ""}
                    placeholder="edge, workers, sqlite"
                    className={INPUT}
                  />
                  <span className="mt-1.5 block text-[11px] text-slate-400">Comma separated. Created on the fly.</span>
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-800">Publish</p>
            <label className="block">
              <span className={LABEL}>Status</span>
              <select name="status" defaultValue={status} className={INPUT}>
                {canPublish ? <option value="publish">Published</option> : null}
                <option value="draft">Draft</option>
                <option value="private">Private</option>
              </select>
            </label>

            {!isPage ? (
              <label className="mt-3 block">
                <span className={LABEL}>Comments</span>
                <select name="comment_status" defaultValue={post?.commentStatus ?? "open"} className={INPUT}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            ) : (
              <>
                <label className="mt-3 block">
                  <span className={LABEL}>Parent page</span>
                  <select name="parent_id" defaultValue={post?.parentId ?? ""} className={INPUT}>
                    <option value="">(none — top level)</option>
                    {parentPages
                      .filter((p) => p.id !== post?.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="mt-3 block">
                  <span className={LABEL}>Menu order</span>
                  <input
                    name="menu_order"
                    type="number"
                    min={0}
                    defaultValue={post?.menuOrder ?? 0}
                    className={INPUT}
                  />
                </label>
              </>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" className={BTN_ACCENT}>
                {submitLabel}
              </button>
              <button type="submit" name="save_draft" value="1" className={BTN_SECONDARY}>
                Save draft
              </button>
            </div>

            {post ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
                <Link href={isPage ? "/admin/pages" : "/admin/posts"} className="text-slate-500 hover:text-slate-800">
                  ← Back to list
                </Link>
                {post.status === "publish" && viewUrl ? (
                  <Link
                    href={viewUrl}
                    target="_blank"
                    className="font-medium text-orange-600 hover:text-orange-500"
                  >
                    View ↗
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className={LABEL}>Featured image</span>
              <select name="featured_media_id" defaultValue={post?.featuredMediaId ?? ""} className={INPUT}>
                <option value="">(none)</option>
                {media.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} — {item.filename}
                  </option>
                ))}
              </select>
            </label>
            {media.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-400">
                Upload images in <Link href="/admin/media" className="text-orange-600">Media</Link> first.
              </p>
            ) : null}
            {post?.featuredMediaId ? (
              <p className="mt-2 text-[11px] text-slate-400">
                Currently: #{post.featuredMediaId}. Transforms available via{" "}
                <code className="vp-font-mono text-[10px]">?w=800</code>.
              </p>
            ) : null}
          </div>

          {post ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
              <p>Last updated: {post.updatedAt} UTC</p>
              {post.publishedAt ? <p>Published: {post.publishedAt} UTC</p> : <p>Not published yet.</p>}
            </div>
          ) : null}

          {post ? (
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <p className="mb-2 text-xs font-semibold text-red-700">Danger zone</p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  form={`trash-post-${post.id}`}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Move to trash
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </form>

    {post ? (
      <form id={`trash-post-${post.id}`} action={trashPostAction} className="hidden">
        <input type="hidden" name="id" value={post.id} />
      </form>
    ) : null}
    </>
  );
}
