import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/press/auth";
import { listPosts } from "@/press/models/posts";
import { postStatusCounts } from "@/press/admin-data";
import { PostList } from "../../components/post-list";
import { Flash, PageHeader } from "../../components/ui";
import type { PostStatus, PostWithAuthor } from "@/press/types";

export const metadata: Metadata = { title: "Pages" };

/** Build hierarchical page paths from the flat page list. */
function buildPagePaths(pages: PostWithAuthor[]): Map<number, string> {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const paths = new Map<number, string>();
  for (const page of pages) {
    const chain: string[] = [page.slug];
    let parent = page.parentId ? byId.get(page.parentId) : undefined;
    let guard = 0;
    while (parent && guard++ < 20) {
      chain.unshift(parent.slug);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    paths.set(page.id, `/${chain.join("/")}`);
  }
  return paths;
}

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;

  const statusParam = String(sp.status ?? "all");
  const search = String(sp.s ?? "").trim();
  const paged = Math.max(1, Number(sp.paged ?? 1) || 1);
  const statuses = ["publish", "draft", "private", "trash"] as const;
  const statusFilter: PostStatus[] =
    statusParam === "all"
      ? ["publish", "draft", "private"]
      : statuses.includes(statusParam as (typeof statuses)[number])
        ? [statusParam as PostStatus]
        : ["publish", "draft", "private"];

  const [{ posts, total }, counts, allPublished] = await Promise.all([
    listPosts({ type: "page", status: statusFilter, search: search || undefined, page: paged, perPage: 20, orderBy: "menu_order" }),
    postStatusCounts("page"),
    listPosts({ type: "page", status: "publish", perPage: 500 }),
  ]);
  const paths = buildPagePaths(allPublished.posts);

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Static, hierarchical content: about pages, docs, landing pages."
        actions={
          <Link
            href="/admin/pages/new"
            className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500"
          >
            + New page
          </Link>
        }
      />

      {sp.trashed ? <Flash tone="warn">Page moved to trash.</Flash> : null}
      {sp.deleted ? <Flash tone="warn">Page deleted permanently.</Flash> : null}

      <PostList
        type="page"
        posts={posts}
        counts={counts}
        activeStatus={statusParam}
        search={search}
        page={paged}
        totalPages={Math.max(1, Math.ceil(total / 20))}
        user={user}
        viewUrlFor={(post) => paths.get(post.id) ?? `/${post.slug}`}
      />
    </div>
  );
}
