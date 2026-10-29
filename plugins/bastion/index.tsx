import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { all, db, num, str } from "../../press/db/client";
import { hashIp } from "../../press/utils/privacy";
import { nowDb } from "../../press/utils/dates";
import type { Post, User } from "../../press/types";

/**
 * Bastion — login protection & audit trail.
 *
 * Throttles brute-force sign-in attempts (5 failures per username+IP in a
 * 15 minute window → 15 minute lockout, stored as salted IP hashes) and
 * records an activity log of sign-ins and content mutations so site owners
 * can see who changed what, and when.
 */

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

export const bastion: PluginDefinition = {
  manifest: {
    slug: "bastion",
    name: "Bastion Security",
    description:
      "Brute-force login throttling with temporary lockouts, plus an audit log of sign-ins, publishes, edits and setting changes.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    // Gate login attempts before credentials are even checked.
    api.addFilter<{ allowed: boolean; reason?: string }>(CoreHooks.LoginThrottle, async (gate, ...args) => {
      const [{ username, ip }] = args as [{ username: string; ip: string }];
      if (!gate.allowed) return gate;
      const ipHash = await hashIp(ip, "bastion");
      const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString().replace("T", " ").slice(0, 19);
      const row = await db()
        .prepare(
          "SELECT COUNT(*) AS n, MAX(created_at) AS last FROM vp_login_attempts WHERE username = ?1 AND ip_hash = ?2 AND success = 0 AND created_at >= ?3",
        )
        .bind(username, ipHash, since)
        .first();
      const failures = num((row ?? {}) as Record<string, unknown>, "n");
      if (failures >= MAX_FAILURES) {
        const last = str((row ?? {}) as Record<string, unknown>, "last");
        const lockedUntil = last
          ? new Date(`${last.replace(" ", "T")}Z`).getTime() + LOCKOUT_MINUTES * 60_000
          : Date.now();
        const minutesLeft = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000));
        return {
          allowed: false,
          reason: `Too many failed attempts. Try again in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        };
      }
      return gate;
    }, 10);

    // Record every attempt.
    api.addAction(CoreHooks.LoginAttempt, async (_value, ...args) => {
      const [{ username, ip, success }] = args as [{ username: string; ip: string; success: boolean }];
      const ipHash = await hashIp(ip, "bastion");
      await db()
        .prepare("INSERT INTO vp_login_attempts (username, ip_hash, success, created_at) VALUES (?1, ?2, ?3, ?4)")
        .bind(username.slice(0, 120), ipHash, success ? 1 : 0, nowDb())
        .run();
      if (success) {
        await log(username, "login", "Signed in through the dashboard");
      }
    });

    // Audit trail for content & configuration changes.
    api.addAction(CoreHooks.PostSaved, async (_value, ...args) => {
      const [post, previous, actor] = args as [Post, Post | null, User | undefined];
      await log(actor?.username ?? "system", previous ? "post_updated" : "post_created", `"${post.title}" (${post.status})`);
    });
    api.addAction(CoreHooks.PostDeleted, async (_value, ...args) => {
      const [post] = args as [Post];
      await log(`post:${post.id}`, "post_deleted", `"${post.title}"`);
    });
    api.addAction(CoreHooks.CommentSubmitted, async (_value, ...args) => {
      const [comment] = args as [{ authorName: string; status: string; id: number }];
      await log(`comment:${comment.id}`, "comment_submitted", `${comment.authorName} (${comment.status})`);
    });
    api.addAction(CoreHooks.MediaUploaded, async (_value, ...args) => {
      const [media] = args as [{ filename: string; id: number }];
      await log(`media:${media.id}`, "media_uploaded", media.filename);
    });
    api.addAction(CoreHooks.SettingsSaved, async (_value, ...args) => {
      const [actor] = args as [string];
      await log(actor || "system", "settings_updated", "Site settings changed");
    });

    api.registerAdminPage({
      title: "Bastion",
      description: "Security & audit log",
      capability: "administrator",
      async render() {
        const attempts = await all(
          db()
            .prepare(
              `SELECT username, ip_hash, COUNT(*) AS n, MAX(created_at) AS last
               FROM vp_login_attempts WHERE success = 0 AND created_at >= datetime('now', '-24 hours')
               GROUP BY username, ip_hash ORDER BY n DESC LIMIT 10`,
            ),
          (r) => ({ username: str(r, "username"), ipHash: str(r, "ip_hash"), n: num(r, "n"), last: str(r, "last") }),
        );
        const activity = await all(
          db().prepare("SELECT * FROM vp_activity ORDER BY created_at DESC, id DESC LIMIT 60"),
          (r) => ({ actor: str(r, "actor"), action: str(r, "action"), detail: str(r, "detail"), at: str(r, "created_at") }),
        );
        const failures24h = attempts.reduce((acc, a) => acc + a.n, 0);

        return (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bastion Security</h1>
              <p className="mt-1 text-sm text-slate-500">
                Lockout policy: {MAX_FAILURES} failed sign-ins per username+IP within {WINDOW_MINUTES} minutes →{" "}
                {LOCKOUT_MINUTES} minute lockout. IPs are stored as salted hashes only.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-slate-900">{failures24h}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Failed sign-ins (24 h)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-slate-900">{activity.length}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Logged events (recent)</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">
                Brute-force candidates (24 h)
              </p>
              {attempts.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No failed sign-ins in the last 24 hours. 🎉</p>
              ) : (
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map((a) => (
                      <tr key={`${a.username}-${a.ipHash}`}>
                        <td className="px-5 py-2.5 text-sm font-medium text-slate-800">{a.username}</td>
                        <td className="vp-font-mono px-5 py-2.5 text-xs text-slate-500">ip#{a.ipHash.slice(0, 10)}</td>
                        <td className="px-5 py-2.5 text-right text-xs text-red-600">{a.n} failures</td>
                        <td className="px-5 py-2.5 text-right text-xs text-slate-400">{a.last}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">Activity log</p>
              {activity.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {activity.map((row, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-2.5 text-sm">
                      <span className="vp-font-mono rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                        {row.action}
                      </span>
                      <span className="text-slate-700">{row.detail}</span>
                      <span className="ml-auto text-xs text-slate-400">
                        {row.actor} · {row.at} UTC
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      },
    });
  },
};

async function log(actor: string, action: string, detail: string): Promise<void> {
  await db()
    .prepare("INSERT INTO vp_activity (actor, action, detail, created_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(actor.slice(0, 120), action.slice(0, 60), detail.slice(0, 300), nowDb())
    .run();
}
