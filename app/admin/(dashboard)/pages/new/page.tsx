import type { Metadata } from "next";
import { getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { listPosts } from "@/press/models/posts";
import { listMedia } from "@/press/models/media";
import { PostEditor } from "../../../components/post-editor";
import { PageHeader } from "../../../components/ui";

export const metadata: Metadata = { title: "Add new page" };

export default async function NewPagePage() {
  const user = (await getCurrentUser())!;
  const press = await getPress();
  const [{ posts: pages }, { items: media }] = await Promise.all([
    listPosts({ type: "page", status: ["publish", "draft", "private"], perPage: 200, orderBy: "title" }),
    listMedia({ perPage: 100 }),
  ]);

  return (
    <div>
      <PageHeader title="Add new page" description="Pages live at their own path and can be nested." />
      <PostEditor
        type="page"
        press={press}
        user={user}
        categories={[]}
        media={media}
        parentPages={pages}
        permalinkHint="/"
      />
    </div>
  );
}
