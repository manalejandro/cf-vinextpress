import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canEditPost, getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { getPostById, getPostTerms } from "@/press/models/posts";
import { listTerms } from "@/press/models/terms";
import { listMedia } from "@/press/models/media";
import { PostEditor } from "../../../components/post-editor";
import { Flash, PageHeader, StatusPill } from "../../../components/ui";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const press = await getPress();

  const post = await getPostById(Number(id));
  if (!post || post.type !== "post") notFound();
  if (!canEditPost(user, post)) redirect("/admin/posts?forbidden=1");

  const [terms, categories, { items: media }] = await Promise.all([
    getPostTerms(post.id),
    listTerms("category"),
    listMedia({ perPage: 100 }),
  ]);

  const saved = String(sp.saved ?? "");

  return (
    <div>
      <PageHeader
        title={
          post.title || "(untitled)"
        }
        description={`Editing post #${post.id}`}
        actions={<StatusPill status={post.status} />}
      />

      {saved === "published" ? <Flash>Post published. It is live on the site.</Flash> : null}
      {saved === "draft" ? <Flash tone="warn">Draft saved.</Flash> : null}
      {saved === "saved" || saved === "updated" ? <Flash>Post updated.</Flash> : null}

      <PostEditor
        type="post"
        post={post}
        user={user}
        categories={categories}
        media={media}
        parentPages={[]}
        postTerms={{
          categories: terms.filter((t) => t.taxonomy === "category").map((t) => t.id),
          tags: terms.filter((t) => t.taxonomy === "tag").map((t) => t.name),
        }}
        permalinkHint={press.settings.permalinkStructure === "date" ? "/2026/10/" : "/"}
        viewUrl={post.status === "publish" ? await press.permalink(post) : null}
      />
    </div>
  );
}
