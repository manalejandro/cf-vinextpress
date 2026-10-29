import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { all, db, num, str } from "../../press/db/client";
import { clientIp, hashIp } from "../../press/utils/privacy";

/**
 * Pulse — privacy-friendly traffic analytics.
 *
 * A ~400 byte inline beacon reports page views to a first-party endpoint;
 * aggregates land in D1 (views per day+path, uniques via a salted, daily
 * rotating IP hash that is never stored in the clear). No cookies, no
 * third parties, no cross-site tracking — just the numbers a publisher
 * actually needs, with a dashboard sparkline and top-pages table.
 */

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const pulse: PluginDefinition = {
  manifest: {
    slug: "pulse",
    name: "Pulse Stats",
    description:
      "Cookieless traffic analytics: a tiny first-party beacon, daily aggregates, uniques via salted IP hashes, sparklines and top pages in the dashboard.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    // Beacon script at the end of every frontend page.
    api.addFilter<unknown[]>(CoreHooks.DocumentFooter, (nodes) => [
      ...nodes,
      <script
        key="pulse-beacon"
        defer
        dangerouslySetInnerHTML={{
          __html: `(function(){
  try{
    var p=location.pathname;
    if(p.indexOf('/admin')===0||p.indexOf('/api')===0)return;
    var b=function(){fetch('/api/v1/ext/pulse/beacon',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({path:p})}).catch(function(){});};
    if(document.visibilityState==='prerender'){document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')b();},{once:true});}else{b();}
  }catch(e){}
})();`,
        }}
      />,
    ]);

    api.registerRestRoute("beacon", {
      async POST(request) {
        const body = (await request.json().catch(() => null)) as { path?: string } | null;
        let path = String(body?.path ?? "");
        if (!path.startsWith("/")) path = "/";
        path = path.slice(0, 300);
        if (path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/media")) {
          return Response.json({ ok: true });
        }
        const day = todayUtc();
        const ipHash = await hashIp(clientIp(request.headers), `pulse-${day}`);
        await db()
          .prepare(
            `INSERT INTO vp_stats_daily (day, path, views, uniques) VALUES (?1, ?2, 1, 0)
             ON CONFLICT(day, path) DO UPDATE SET views = views + 1`,
          )
          .bind(day, path)
          .run();
        if (ipHash) {
          const inserted = await db()
            .prepare("INSERT OR IGNORE INTO vp_stats_uniques (day, ip_hash) VALUES (?1, ?2)")
            .bind(day, ipHash)
            .run();
          if (inserted.meta.changes > 0) {
            await db()
              .prepare(
                `UPDATE vp_stats_daily SET uniques = uniques + 1 WHERE day = ?1 AND path = ?2`,
              )
              .bind(day, path)
              .run();
          }
        }
        return Response.json({ ok: true });
      },
    });

    // JSON summary for external tooling (authenticated).
    api.registerRestRoute("summary", {
      async GET(_request, ctx) {
        if (!ctx.user) return Response.json({ error: "Authentication required" }, { status: 401 });
        try {
          const days = await all(
            db().prepare(
              "SELECT day, SUM(views) AS views, SUM(uniques) AS uniques FROM vp_stats_daily GROUP BY day ORDER BY day DESC LIMIT 30",
            ),
            (r) => ({ day: str(r, "day"), views: num(r, "views"), uniques: num(r, "uniques") }),
          );
          return Response.json({ days });
        } catch {
          return Response.json({ days: [] });
        }
      },
    });

    api.registerAdminPage({
      title: "Pulse",
      description: "Traffic analytics",
      capability: "editor",
      async render() {
        const daily = await all(
          db()
            .prepare(
              "SELECT day, SUM(views) AS views, SUM(uniques) AS uniques FROM vp_stats_daily GROUP BY day ORDER BY day DESC LIMIT 14",
            ),
          (r) => ({ day: str(r, "day"), views: num(r, "views"), uniques: num(r, "uniques") }),
        );
        const top = await all(
          db()
            .prepare(
              `SELECT path, SUM(views) AS views, SUM(uniques) AS uniques FROM vp_stats_daily
               WHERE day >= date('now', '-30 days') GROUP BY path ORDER BY views DESC LIMIT 10`,
            ),
          (r) => ({ path: str(r, "path"), views: num(r, "views"), uniques: num(r, "uniques") }),
        );
        const reversed = [...daily].reverse();
        const today = daily.find((d) => d.day === todayUtc());
        const week = daily.slice(0, 7).reduce((acc, d) => acc + d.views, 0);
        const monthViews = (
          await all(
            db()
              .prepare(
                "SELECT SUM(views) AS views, SUM(uniques) AS uniques FROM vp_stats_daily WHERE day >= date('now', '-30 days')",
              ),
            (r) => ({ views: num(r, "views"), uniques: num(r, "uniques") }),
          )
        )[0];

        // Sparkline geometry.
        const width = 560;
        const height = 90;
        const max = Math.max(1, ...reversed.map((d) => d.views));
        const step = reversed.length > 1 ? width / (reversed.length - 1) : width;
        const points = reversed
          .map((d, i) => `${(i * step).toFixed(1)},${(height - (d.views / max) * (height - 12) - 6).toFixed(1)}`)
          .join(" ");

        return (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pulse Stats</h1>
              <p className="mt-1 text-sm text-slate-500">
                Cookieless, first-party analytics. Uniques are approximated with a daily-rotating salted hash of
                the visitor IP — nothing personal is stored.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Views today", value: today?.views ?? 0 },
                { label: "Views last 7 days", value: week },
                { label: "Views last 30 days", value: monthViews?.views ?? 0 },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-800">Last {reversed.length || 0} days</p>
              {reversed.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No traffic recorded yet — the beacon starts counting on the next page view.
                </p>
              ) : (
                <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label="Views per day">
                  <polyline fill="none" stroke="#ea580c" strokeWidth="2.5" points={points} />
                  {reversed.map((d, i) => (
                    <circle
                      key={d.day}
                      cx={i * step}
                      cy={height - (d.views / max) * (height - 12) - 6}
                      r="3"
                      fill="#ea580c"
                    >
                      <title>{`${d.day}: ${d.views} views / ${d.uniques} uniques`}</title>
                    </circle>
                  ))}
                </svg>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">
                Top pages (30 days)
              </p>
              {top.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing yet.</p>
              ) : (
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {top.map((row) => (
                      <tr key={row.path}>
                        <td className="vp-font-mono px-5 py-2.5 text-xs text-slate-700">{row.path}</td>
                        <td className="px-5 py-2.5 text-right text-xs text-slate-500">{row.views} views</td>
                        <td className="px-5 py-2.5 text-right text-xs text-slate-500">{row.uniques} uniques</td>
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
