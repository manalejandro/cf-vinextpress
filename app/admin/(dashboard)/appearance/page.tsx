import type { Metadata } from "next";
import Link from "next/link";
import { can, getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { listThemes } from "@/press/themes/registry";
import { listPosts } from "@/press/models/posts";
import { activateThemeAction, saveNavMenuAction } from "../../actions";
import { BTN_PRIMARY, Card, Flash, INPUT, PageHeader } from "../../components/ui";
import { VINEXTPRESS_REPO } from "@/press/version";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const press = await getPress();
  const canSwitch = can(user, "switch_themes");
  const themes = listThemes();

  const { posts: pages } = await listPosts({ type: "page", status: "publish", perPage: 100, orderBy: "title" });
  const menu = press.settings.navMenu;

  return (
    <div>
      <PageHeader
        title="Appearance"
        description="Themes reshape the entire frontend; menus drive every theme's navigation."
      />

      {sp.theme ? <Flash>Theme “{String(sp.theme)}” is now live across the site.</Flash> : null}
      {sp.menu ? <Flash>Navigation menu saved.</Flash> : null}

      <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-700 uppercase">Themes</h2>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => {
          const active = theme.manifest.slug === press.settings.activeTheme;
          return (
            <div
              key={theme.manifest.slug}
              className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
                active ? "border-orange-500 ring-2 ring-orange-500/30" : "border-slate-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.manifest.screenshot}
                alt={`${theme.manifest.name} preview`}
                className="aspect-[4/3] w-full border-b border-slate-100 object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{theme.manifest.name}</p>
                  <span className="vp-font-mono text-[10px] text-slate-400">v{theme.manifest.version}</span>
                </div>
                <p className="flex-1 text-xs leading-5 text-slate-500">{theme.manifest.description}</p>
                <p className="text-[11px] text-slate-400">by {theme.manifest.author}</p>
                {active ? (
                  <span className="mt-1 inline-block self-start rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">
                    ● Active theme
                  </span>
                ) : canSwitch ? (
                  <form action={activateThemeAction} className="mt-1">
                    <input type="hidden" name="slug" value={theme.manifest.slug} />
                    <button type="submit" className={BTN_PRIMARY}>
                      Activate {theme.manifest.name}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Themes are code-first: drop a new folder into <code className="vp-font-mono">themes/</code> and register it
        in <code className="vp-font-mono">themes/index.ts</code>. See{" "}
        <Link href={`${VINEXTPRESS_REPO}/blob/main/docs/THEMES.md`} className="text-orange-600 hover:underline">
          docs/THEMES.md
        </Link>
        .
      </p>

      <h2 className="mt-10 mb-3 text-sm font-bold tracking-wide text-slate-700 uppercase">Navigation menu</h2>
      <Card title="Main menu (used by every theme's header and footer)">
        <form action={saveNavMenuAction} className="flex flex-col gap-3">
          {[...menu, { label: "", url: "" }, { label: "", url: "" }].map((item, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                name="menu_label"
                defaultValue={item.label}
                placeholder={index < menu.length ? "Label" : "+ Add item (leave empty to skip)"}
                className={`${INPUT} max-w-52`}
              />
              <input
                name="menu_url"
                defaultValue={item.url}
                placeholder="/path or https://…"
                className={`${INPUT} vp-font-mono max-w-72 text-xs`}
              />
            </div>
          ))}
          <div className="mt-1 flex items-center gap-2">
            <button type="submit" className={BTN_PRIMARY} disabled={!canSwitch}>
              Save menu
            </button>
            {!canSwitch ? <span className="text-xs text-slate-400">Administrators only.</span> : null}
          </div>
          <p className="text-[11px] text-slate-400">
            Tip: link to pages ({pages.slice(0, 3).map((p) => `/${p.slug}`).join(", ") || "/about"}), archives
            (/category/news), or external sites.
          </p>
        </form>
      </Card>
    </div>
  );
}
