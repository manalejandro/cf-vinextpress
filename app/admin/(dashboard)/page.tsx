import type { Metadata } from "next";
import Link from "next/link";
import { getPress } from "@/press/context";
import { countPosts } from "@/press/models/posts";
import { countComments, listComments } from "@/press/models/comments";
import { listUsers } from "@/press/models/users";
import { db, num } from "@/press/db/client";
import { timeAgo } from "@/press/utils/dates";
import { quickDraftAction } from "../actions";
import { Card, Flash, PageHeader, StatusPill } from "../components/ui";
import { VINEXTPRESS_VERSION } from "@/press/version";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const press = await getPress();

  const [publishedPosts, draftPosts, pageCount, pendingComments, totalComments, mediaCount] = await Promise.all([
    countPosts("post", "publish"),
    countPosts("post", "draft"),
    countPosts("page"),
    countComments("pending"),
    countComments(),
    db()
      .prepare("SELECT COUNT(*) AS n FROM vp_media")
      .first()
      .then((r) => num((r ?? {}) as Record<string, unknown>, "n"))
      .catch(() => 0),
  ]);
  const users = await listUsers();
  const { comments: recentComments } = await listComments({ perPage: 5, status: "all" });

  const stats = [
    { label: "Published posts", value: publishedPosts, href: "/admin/posts?status=publish" },
    { label: "Drafts", value: draftPosts, href: "/admin/posts?status=draft" },
    { label: "Pages", value: pageCount, href: "/admin/pages" },
    { label: "Pending comments", value: pendingComments, href: "/admin/comments?status=pending" },
    { label: "Media files", value: mediaCount, href: "/admin/media" },
    { label: "Users", value: users.length, href: "/admin/users" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${press.settings.siteTitle} — ${press.settings.siteTagline || "no tagline yet"}`}
        actions={
          <>
            <Link href="/admin/posts/new" className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-500">
              + New post
            </Link>
            <Link href="/" target="_blank" className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              View site ↗
            </Link>
          </>
        }
      />

      {sp.installed ? (
        <Flash>
          🎉 Installation complete — VinextPress is live. Starter content has been published; edit or delete it
          any time.
        </Flash>
      ) : null}
      {sp.saved ? <Flash>Settings saved.</Flash> : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Quick draft" className="lg:col-span-1">
          <form action={quickDraftAction} className="flex flex-col gap-3">
            <input
              name="title"
              required
              placeholder="What's on your mind?"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
            <button
              type="submit"
              className="self-start rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              Save draft
            </button>
            <p className="text-xs text-slate-400">You'll land in the editor to finish the story.</p>
          </form>
        </Card>

        <Card
          title="Recent comments"
          className="lg:col-span-2"
          footer={
            <Link href="/admin/comments" className="text-xs font-semibold text-orange-600 hover:text-orange-500">
              Moderate all {totalComments} comments →
            </Link>
          }
        >
          {recentComments.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentComments.map((comment) => (
                <li key={comment.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {comment.authorName}{" "}
                      <span className="font-normal text-slate-400">· {timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="truncate text-slate-500">{comment.content.slice(0, 90)}</p>
                  </div>
                  <StatusPill status={comment.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="At a glance">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-slate-500">Version</dt>
            <dd className="font-medium">VinextPress {VINEXTPRESS_VERSION}</dd>
            <dt className="text-slate-500">Theme</dt>
            <dd className="font-medium capitalize">{press.theme.manifest.name}</dd>
            <dt className="text-slate-500">Active plugins</dt>
            <dd className="font-medium">{press.settings.activePlugins.length}</dd>
            <dt className="text-slate-500">Permalinks</dt>
            <dd className="vp-font-mono text-xs">
              {press.settings.permalinkStructure === "date" ? "/2026/10/post-name" : "/post-name"}
            </dd>
            <dt className="text-slate-500">Runtime</dt>
            <dd className="font-medium">Cloudflare Workers · D1 · R2</dd>
          </dl>
        </Card>

        <Card title="Next steps">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Set your <Link className="font-medium text-orange-600" href="/admin/settings">site URL and tagline</Link>{" "}
              so feeds, sitemaps and SEO tags emit absolute links.
            </li>
            <li>
              Write your first real post — Markdown, shortcodes and featured images all work out of the box.
            </li>
            <li>
              Browse <Link className="font-medium text-orange-600" href="/admin/appearance">Appearance</Link> to
              switch themes, or <Link className="font-medium text-orange-600" href="/admin/plugins">Plugins</Link>{" "}
              to extend behaviour.
            </li>
            <li>
              Read the <Link className="font-medium text-orange-600" href="/api/v1" target="_blank">REST API</Link>{" "}
              discovery document to integrate external tools.
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
