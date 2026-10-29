import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { all, db, num, str } from "../../press/db/client";
import { can } from "../../press/auth";
import { escapeHtml } from "../../press/content/format";
import { deleteRedirectAction, addRedirectAction, toggleRedirectAction } from "./actions";

/**
 * Waypoint — redirect manager.
 *
 * Maps old paths to new destinations with 301 (permanent) or 302
 * (temporary) status, counts hits, and intercepts unresolved URLs before
 * the 404 template renders — the classic "moved my site, keep my links"
 * tooling, built in.
 */

interface RedirectRow {
  id: number;
  source: string;
  target: string;
  statusCode: number;
  hits: number;
  active: number;
}

function mapRow(row: Record<string, unknown>): RedirectRow {
  return {
    id: num(row, "id"),
    source: str(row, "source"),
    target: str(row, "target"),
    statusCode: num(row, "status_code"),
    hits: num(row, "hits"),
    active: num(row, "active"),
  };
}

export const waypoint: PluginDefinition = {
  manifest: {
    slug: "waypoint",
    name: "Waypoint Redirects",
    description:
      "301/302 redirect rules with hit counters. Unresolved URLs are checked against your rules before the 404 page renders.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.addFilter<{ target: string; permanent?: boolean } | null>(
      CoreHooks.PreNotFound,
      async (_value, ...args) => {
        const [pathname] = args as [string];
        const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
        const row = await db()
          .prepare("SELECT * FROM vp_redirects WHERE active = 1 AND source = ?1 LIMIT 1")
          .bind(normalized)
          .first();
        if (!row) return null;
        const redirect = mapRow(row as unknown as Record<string, unknown>);
        // Count the hit (fire-and-forget is fine; awaited keeps tests deterministic).
        await db().prepare("UPDATE vp_redirects SET hits = hits + 1 WHERE id = ?1").bind(redirect.id).run();
        return { target: redirect.target, permanent: redirect.statusCode === 301 };
      },
      10,
    );

    // REST management surface: GET list, POST create (authenticated editors).
    api.registerRestRoute("redirects", {
      async GET(_request, ctx) {
        if (!ctx.user || !can(ctx.user, "edit_others_posts")) {
          return Response.json({ error: "Authentication required" }, { status: 401 });
        }
        const rows = await all(db().prepare("SELECT * FROM vp_redirects ORDER BY id DESC LIMIT 500"), mapRow);
        return Response.json({ redirects: rows });
      },
      async POST(request, ctx) {
        if (!ctx.user || !can(ctx.user, "edit_others_posts")) {
          return Response.json({ error: "Authentication required" }, { status: 401 });
        }
        const body = (await request.json().catch(() => null)) as {
          source?: string;
          target?: string;
          status?: number;
        } | null;
        let source = String(body?.source ?? "").trim();
        const target = String(body?.target ?? "").trim();
        if (source && !source.startsWith("/") && !source.startsWith("http")) source = `/${source}`;
        if (source.length > 1) source = source.replace(/\/+$/, "");
        if (!source || !target) return Response.json({ error: "source and target are required" }, { status: 400 });
        const status = Number(body?.status) === 302 ? 302 : 301;
        try {
          const result = await db()
            .prepare("INSERT INTO vp_redirects (source, target, status_code, hits, active) VALUES (?1, ?2, ?3, 0, 1)")
            .bind(source, target.slice(0, 500), status)
            .run();
          return Response.json({ id: Number(result.meta.last_row_id), source, target, status }, { status: 201 });
        } catch {
          return Response.json({ error: "source already exists" }, { status: 409 });
        }
      },
    });

    api.registerAdminPage({
      title: "Waypoint",
      description: "Redirect rules",
      capability: "editor",
      async render({ searchParams }) {
        const rows = await all(db().prepare("SELECT * FROM vp_redirects ORDER BY hits DESC, id DESC LIMIT 300"), mapRow);
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Waypoint Redirects</h1>
              <p className="mt-1 text-sm text-slate-500">
                Rules apply when a URL would otherwise 404. Permanent rules answer 308, temporary ones 307
                (method-preserving equivalents of 301/302).
              </p>
            </div>

            {searchParams.added ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                Redirect created.
              </div>
            ) : null}
            {searchParams.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {escapeHtml(String(searchParams.error))}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-800">Add a rule</p>
              <form action={addRedirectAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  name="source"
                  required
                  placeholder="/old-path"
                  className="vp-font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm outline-none focus:border-orange-500"
                />
                <input
                  name="target"
                  required
                  placeholder="/new-path or https://…"
                  className="vp-font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm outline-none focus:border-orange-500"
                />
                <select name="status" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm">
                  <option value="301">301 permanent</option>
                  <option value="302">302 temporary</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  Add redirect
                </button>
              </form>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">No redirect rules yet.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Source</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Target</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hits</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className={row.active ? "" : "opacity-50"}>
                        <td className="vp-font-mono px-4 py-3 text-xs text-slate-800">{row.source}</td>
                        <td className="vp-font-mono px-4 py-3 text-xs text-slate-600">{row.target}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{row.statusCode}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600">{row.hits}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            <form action={toggleRedirectAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <button type="submit" className="font-semibold text-slate-500 hover:text-slate-900">
                                {row.active ? "Disable" : "Enable"}
                              </button>
                            </form>
                            <form action={deleteRedirectAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <button type="submit" className="font-semibold text-slate-400 hover:text-red-600">
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      },
    });
  },
};
