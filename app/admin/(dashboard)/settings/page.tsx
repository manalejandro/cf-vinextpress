import type { Metadata } from "next";
import { can, getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { listPosts } from "@/press/models/posts";
import { saveSettingsAction } from "../../actions";
import { BTN_ACCENT, Card, Flash, INPUT, LABEL, PageHeader } from "../../components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const press = await getPress();
  const canManage = can(user, "manage_options");
  const s = press.settings;
  const { posts: pages } = await listPosts({ type: "page", status: "publish", perPage: 200, orderBy: "title" });

  const disabled = canManage ? undefined : { disabled: true };

  return (
    <div>
      <PageHeader title="Settings" description="Site identity, reading behaviour, discussion and permalinks." />
      {sp.saved ? <Flash>Settings saved and caches invalidated.</Flash> : null}
      {!canManage ? <Flash tone="warn">Only administrators can change settings — the form is read-only for you.</Flash> : null}

      <form action={saveSettingsAction} className="flex max-w-3xl flex-col gap-6">
        <Card title="General">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={LABEL}>Site title</span>
              <input name="site_title" defaultValue={s.siteTitle} required maxLength={120} className={INPUT} {...disabled} />
            </label>
            <label>
              <span className={LABEL}>Tagline</span>
              <input name="site_tagline" defaultValue={s.siteTagline} maxLength={240} className={INPUT} {...disabled} />
            </label>
            <label>
              <span className={LABEL}>Site URL</span>
              <input name="site_url" type="url" defaultValue={s.siteUrl} placeholder="https://example.com" className={INPUT} {...disabled} />
              <span className="mt-1 block text-[11px] text-slate-400">Absolute base for feeds, sitemaps, canonical and OG tags.</span>
            </label>
            <label>
              <span className={LABEL}>Admin email</span>
              <input name="admin_email" type="email" defaultValue={s.adminEmail} className={INPUT} {...disabled} />
            </label>
          </div>
        </Card>

        <Card title="Reading">
          <fieldset className="flex flex-col gap-2">
            <legend className={LABEL}>Your front page displays</legend>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="show_on_front" value="posts" defaultChecked={s.showOnFront === "posts"} className="accent-orange-600" {...disabled} />
              Your latest posts
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="show_on_front" value="page" defaultChecked={s.showOnFront === "page"} className="accent-orange-600" {...disabled} />
              A static page
            </label>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className={LABEL}>Front page (static)</span>
              <select name="page_on_front" defaultValue={s.pageOnFront ?? ""} className={INPUT} {...disabled}>
                <option value="">— select —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={LABEL}>Posts page (blog index)</span>
              <select name="page_for_posts" defaultValue={s.pageForPosts ?? ""} className={INPUT} {...disabled}>
                <option value="">— select —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={LABEL}>Posts per page</span>
              <input name="posts_per_page" type="number" min={1} max={50} defaultValue={s.postsPerPage} className={INPUT} {...disabled} />
            </label>
          </div>
        </Card>

        <Card title="Discussion">
          <fieldset className="flex flex-col gap-2">
            <legend className={LABEL}>Comment moderation</legend>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="comment_moderation" value="manual" defaultChecked={s.commentModeration === "manual"} className="accent-orange-600" {...disabled} />
              Hold every comment for moderation
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="comment_moderation" value="auto" defaultChecked={s.commentModeration === "auto"} className="accent-orange-600" {...disabled} />
              Approve automatically (Spam Shield still filters obvious spam)
            </label>
          </fieldset>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="require_name_email" defaultChecked={s.requireNameEmail} className="h-4 w-4 accent-orange-600" {...disabled} />
            Commenters must fill in name and email
          </label>
        </Card>

        <Card title="Permalinks">
          <fieldset className="flex flex-col gap-2">
            <legend className={LABEL}>Post URL structure</legend>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="permalink_structure" value="post-name" defaultChecked={s.permalinkStructure === "post-name"} className="accent-orange-600" {...disabled} />
              Post name <code className="vp-font-mono text-xs text-slate-400">/my-first-post</code>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="permalink_structure" value="date" defaultChecked={s.permalinkStructure === "date"} className="accent-orange-600" {...disabled} />
              Day and name <code className="vp-font-mono text-xs text-slate-400">/2026/10/my-first-post</code>
            </label>
          </fieldset>
          <p className="mt-3 text-[11px] text-slate-400">
            Non-canonical URLs redirect automatically, so changing the structure never breaks existing links.
          </p>
        </Card>

        <div className="flex items-center gap-3">
          <button type="submit" className={BTN_ACCENT} disabled={!canManage}>
            Save settings
          </button>
          <span className="text-xs text-slate-400">Saving invalidates cached pages site-wide.</span>
        </div>
      </form>
    </div>
  );
}
