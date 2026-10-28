import type { Metadata } from "next";
import { getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { listTerms } from "@/press/models/terms";
import { listMedia } from "@/press/models/media";
import { PostEditor } from "../../../components/post-editor";
import { PageHeader } from "../../../components/ui";

export const metadata: Metadata = { title: "Add new post" };

export default async function NewPostPage() {
  const user = (await getCurrentUser())!;
  const press = await getPress();
  const [categories, { items: media }] = await Promise.all([
    listTerms("category"),
    listMedia({ perPage: 100 }),
  ]);

  return (
    <div>
      <PageHeader title="Add new post" description="Markdown by default — switch to HTML any time." />
      <PostEditor
        type="post"
        user={user}
        categories={categories}
        media={media}
        parentPages={[]}
        postTerms={{ categories: [], tags: [] }}
        permalinkHint={press.settings.permalinkStructure === "date" ? "/2026/10/" : "/"}
      />
    </div>
  );
}
