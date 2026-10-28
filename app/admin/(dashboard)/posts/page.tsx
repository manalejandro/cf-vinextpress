import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { listPosts } from "@/press/models/posts";
import { approvedCommentCountByPost, postStatusCounts } from "@/press/admin-data";
import { postPath } from "@/press/permalinks";
import type { PostStatus } from "@/press/types";
import { PostList } from "../../components/post-list";
import { Flash, PageHeader } from "../../components/ui";

export const metadata: Metadata = { title: "Posts" };

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const press = await getPress();

  const statusParam = String(sp.status ?? "all");
  const search = String(sp.s ?? "").trim();
  const paged = Math.max(1, Number(sp.paged ?? 1) || 1);

  const statusFilter: PostStatus[] | "any" =
    statusParam === "all"
      ? ["publish", "draft", "private"]
      : (["publish", "draft", "private", "trash"] as PostStatus[]).includes(statusParam as PostStatus)
        ? [statusParam as PostStatus]
        : ["publish", "draft", "private"];

  const [{ posts, total }, counts, commentCounts] = await Promise.all([
    listPosts({ type: "post", status: statusFilter, search: search || undefined, page: paged, perPage: 20, orderBy: "created" }),
    postStatusCounts("post"),
    approvedCommentCountByPost(),
  ]);

  return (
    <div>
      <PageHeader
        title="Posts"
        description="Everything you have written, from first draft to published."
        actions={
          <Link
            href="/admin/posts/new"
            className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500"
          >
            + New post
          </Link>
        }
      />

      {sp.trashed ? <Flash tone="warn">Post moved to trash.</Flash> : null}
      {sp.deleted ? <Flash tone="warn">Post deleted permanently.</Flash> : null}

      <PostList
        type="post"
        posts={posts}
        counts={counts}
        commentCounts={commentCounts}
        activeStatus={statusParam}
        search={search}
        page={paged}
        totalPages={Math.max(1, Math.ceil(total / 20))}
        user={user}
        viewUrlFor={(post) => postPath(post, press.settings)}
      />
    </div>
  );
}
