import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canEditPost, getCurrentUser } from "@/press/auth";
import { getPostById } from "@/press/models/posts";
import { listPosts } from "@/press/models/posts";
import { listMedia } from "@/press/models/media";
import { PostEditor } from "../../../components/post-editor";
import { Flash, PageHeader, StatusPill } from "../../../components/ui";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;

  const page = await getPostById(Number(id));
  if (!page || page.type !== "page") notFound();
  if (!canEditPost(user, page)) redirect("/admin/pages");

  const [{ posts: pages }, { items: media }] = await Promise.all([
    listPosts({ type: "page", status: ["publish", "draft", "private"], perPage: 200, orderBy: "title" }),
    listMedia({ perPage: 100 }),
  ]);

  const saved = String(sp.saved ?? "");

  return (
    <div>
      <PageHeader
        title={page.title || "(untitled)"}
        description={`Editing page #${page.id}`}
        actions={<StatusPill status={page.status} />}
      />

      {saved === "published" ? <Flash>Page published.</Flash> : null}
      {saved === "draft" ? <Flash tone="warn">Draft saved.</Flash> : null}
      {saved === "saved" || saved === "updated" ? <Flash>Page updated.</Flash> : null}

      <PostEditor
        type="page"
        post={page}
        user={user}
        categories={[]}
        media={media}
        parentPages={pages}
        permalinkHint="/"
        viewUrl={page.status === "publish" ? `/${page.slug}` : null}
      />
    </div>
  );
}
