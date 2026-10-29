import type { Metadata } from "next";
import Link from "next/link";
import { can, getCurrentUser } from "@/press/auth";
import { getPress } from "@/press/context";
import { listPlugins } from "@/press/plugins/registry";
import { togglePluginAction } from "../../actions";
import { Flash, PageHeader } from "../../components/ui";
import { VINEXTPRESS_REPO } from "@/press/version";

export const metadata: Metadata = { title: "Plugins" };

export default async function PluginsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const press = await getPress();
  const canManage = can(user, "manage_plugins");
  const active = new Set(press.settings.activePlugins);
  const plugins = listPlugins();

  return (
    <div>
      <PageHeader
        title="Plugins"
        description="Extensions hook into filters and actions across the whole rendering pipeline."
      />

      {sp.enabled ? <Flash>Plugin enabled: {String(sp.enabled)}.</Flash> : null}
      {sp.disabled ? <Flash tone="warn">Plugin disabled: {String(sp.disabled)}.</Flash> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {plugins.map((plugin) => {
            const isActive = active.has(plugin.manifest.slug);
            return (
              <li key={plugin.manifest.slug} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                    {plugin.manifest.name}
                    <span className="vp-font-mono text-[10px] font-normal text-slate-400">
                      v{plugin.manifest.version} · {plugin.manifest.slug}
                    </span>
                    {isActive ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Active
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{plugin.manifest.description}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    by {plugin.manifest.author}
                    {press.adminPages.has(plugin.manifest.slug) ? (
                      <>
                        {" · "}
                        <Link
                          href={`/admin/ext/${plugin.manifest.slug}`}
                          className="font-semibold text-orange-600 hover:text-orange-500"
                        >
                          open screen →
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>

                {canManage ? (
                  <form action={togglePluginAction} className="shrink-0">
                    <input type="hidden" name="slug" value={plugin.manifest.slug} />
                    <input type="hidden" name="active" value={isActive ? "0" : "1"} />
                    <button
                      type="submit"
                      className={`rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
                        isActive
                          ? "border border-slate-300 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600"
                          : "bg-slate-900 text-white hover:bg-slate-700"
                      }`}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        Write your own: create a folder in <code className="vp-font-mono">plugins/</code>, export a{" "}
        <code className="vp-font-mono">PluginDefinition</code> and register it in{" "}
        <code className="vp-font-mono">plugins/index.ts</code>. Hooks, shortcodes and REST routes are all available —
        see{" "}
        <Link href={`${VINEXTPRESS_REPO}/blob/main/docs/PLUGINS.md`} className="text-orange-600 hover:underline">
          docs/PLUGINS.md
        </Link>
        .
      </p>
    </div>
  );
}
