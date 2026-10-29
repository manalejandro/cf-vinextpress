import type { PluginDefinition, PluginRestContext } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { all, db, num, str } from "../../press/db/client";
import { getOption } from "../../press/options";
import { escapeHtml } from "../../press/content/format";
import { clientIp, hashIp } from "../../press/utils/privacy";
import { nowDb } from "../../press/utils/dates";
import { can } from "../../press/auth";
import { FormsmithEnhancer } from "./form-block";
import { deleteEntryAction, saveFormsSchemaAction, setEntryStatusAction } from "./actions";

/**
 * Formsmith — embeddable forms with stored submissions.
 *
 * The functional equivalent of the classic contact-form plugins: authors
 * drop [form id="contact"] into any post or page; visitors submit; entries
 * land in a moderation-style inbox in the dashboard, exportable as CSV.
 * Form schemas are JSON (defaults below, overridable in the dashboard).
 */

interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "email" | "textarea" | "url";
  required?: boolean;
  placeholder?: string;
}

interface FormDef {
  title: string;
  description?: string;
  fields: FieldDef[];
}

const DEFAULT_FORMS: Record<string, FormDef> = {
  contact: {
    title: "Contact us",
    description: "We usually reply within one business day.",
    fields: [
      { name: "name", label: "Your name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "subject", label: "Subject", type: "text", placeholder: "What is this about?" },
      { name: "message", label: "Message", type: "textarea", required: true },
    ],
  },
  newsletter: {
    title: "Newsletter",
    description: "One email per month. No spam, ever.",
    fields: [{ name: "email", label: "Email address", type: "email", required: true }],
  },
};

async function loadForms(): Promise<Record<string, FormDef>> {
  const raw = await getOption("formsmith_forms", "");
  if (!raw) return DEFAULT_FORMS;
  try {
    const parsed = JSON.parse(raw) as Record<string, FormDef>;
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_FORMS;
    return { ...DEFAULT_FORMS, ...parsed };
  } catch {
    return DEFAULT_FORMS;
  }
}

function renderFormHtml(id: string, def: FormDef): string {
  const fields = def.fields
    .map((field) => {
      const type = field.type ?? "text";
      const required = field.required ? " required" : "";
      const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
      const control =
        type === "textarea"
          ? `<textarea name="${escapeHtml(field.name)}" rows="5"${required}${placeholder}></textarea>`
          : `<input type="${escapeHtml(type)}" name="${escapeHtml(field.name)}"${required}${placeholder}>`;
      return `<label class="vp-field"><span>${escapeHtml(field.label)}${
        field.required ? ' <em aria-label="required">*</em>' : ""
      }</span>${control}</label>`;
    })
    .join("");

  return `<form class="vp-formsmith" data-vp-form="${escapeHtml(id)}" method="post" action="/api/v1/ext/formsmith/submit">
<p class="vp-formsmith-title">${escapeHtml(def.title)}</p>
${def.description ? `<p class="vp-formsmith-desc">${escapeHtml(def.description)}</p>` : ""}
<p class="vp-comment-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="company" tabindex="-1" autocomplete="off"></label></p>
${fields}
<p class="vp-formsmith-status" data-fs-status role="status" aria-live="polite"></p>
<button type="submit" class="vp-button vp-button-solid">Send</button>
</form>`;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function handleSubmit(request: Request, ctx: PluginRestContext): Promise<Response> {
  const isFetch = request.headers.get("x-vp-fetch") === "1";
  let formId = "";
  let data: Record<string, string> = {};
  let ref = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      form?: string;
      data?: Record<string, unknown>;
      ref?: string;
    } | null;
    formId = String(body?.form ?? "");
    ref = String(body?.ref ?? "");
    for (const [key, value] of Object.entries(body?.data ?? {})) data[key] = String(value);
  } else {
    const form = await request.formData().catch(() => null);
    if (!form) return respond(isFetch, 400, "Bad request", request);
    formId = String(form.get("_form") ?? "");
    ref = String(form.get("_ref") ?? request.headers.get("referer") ?? "/");
    form.forEach((value, key) => {
      if (key !== "_form" && key !== "_ref") data[key] = String(value);
    });
  }

  const forms = await loadForms();
  const def = forms[formId];
  if (!def) return respond(isFetch, 404, `Unknown form: ${formId || "(none)"}`, request);

  // Honeypot + timing: bots fill everything and submit instantly.
  if (String(data.company ?? "").length > 0) {
    return respond(isFetch, 200, "Thanks! Your message was sent.", request, true);
  }

  for (const field of def.fields) {
    const value = (data[field.name] ?? "").trim();
    if (field.required && !value) {
      return respond(isFetch, 400, `Please fill in: ${field.label}`, request);
    }
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return respond(isFetch, 400, `A valid email is required for: ${field.label}`, request);
    }
    if (value.length > 5000) {
      return respond(isFetch, 400, `Field too long: ${field.label}`, request);
    }
  }

  const ip = clientIp(request.headers);
  const ipHash = await hashIp(ip, "formsmith");
  await db()
    .prepare(
      "INSERT INTO vp_form_entries (form_id, data, ip_hash, status, created_at) VALUES (?1, ?2, ?3, 'new', ?4)",
    )
    .bind(formId, JSON.stringify(data).slice(0, 20000), ipHash, nowDb())
    .run();

  if (isFetch) {
    return Response.json({ ok: true, message: "Thanks! Your message was sent." });
  }
  const target = ref && ref.startsWith("/") ? ref : "/";
  return new Response(null, { status: 303, headers: { location: `${target}?fs=sent#${formId}` } });
}

function respond(isFetch: boolean, status: number, message: string, request: Request, silent = false): Response {
  if (isFetch) return Response.json({ ok: silent || status < 400, message }, { status });
  const referer = request.headers.get("referer") ?? "/";
  const target = referer.startsWith("http") ? new URL(referer).pathname : "/";
  return new Response(null, { status: 303, headers: { location: `${target}?fs=${silent ? "sent" : "error"}` } });
}

export const formsmith: PluginDefinition = {
  manifest: {
    slug: "formsmith",
    name: "Formsmith",
    description:
      "Embeddable contact & signup forms with a submissions inbox, spam honeypot and CSV export. Use [form id=\"contact\"] anywhere.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.registerShortcode("form", async (attrs) => {
      const id = (attrs.id ?? "contact").toLowerCase();
      const forms = await loadForms();
      const def = forms[id];
      if (!def) return `<!-- formsmith: unknown form "${escapeHtml(id)}" -->`;
      return renderFormHtml(id, def);
    });

    // Enhancer + scoped styles, injected once per frontend page.
    api.addFilter<unknown[]>(CoreHooks.DocumentFooter, (nodes) => [
      ...nodes,
      <style
        key="formsmith-css"
        dangerouslySetInnerHTML={{
          __html: `.vp-formsmith{display:flex;flex-direction:column;gap:1em;max-width:34rem;margin:2em 0;padding:1.4rem;border:1px solid var(--vp-line);border-radius:var(--vp-radius);background:var(--vp-card)}
.vp-formsmith-title{font-family:var(--vp-font-head);font-size:1.25rem;font-weight:700;margin:0}
.vp-formsmith-desc{margin:0;font-size:.9rem;color:var(--vp-muted)}
.vp-formsmith-status{min-height:1.2em;margin:0;font-size:.9rem}
.vp-formsmith-status[data-tone="ok"]{color:#15803d}
.vp-formsmith-status[data-tone="error"]{color:#b91c1c}`,
        }}
      />,
      <FormsmithEnhancer key="formsmith-enhancer" />,
    ]);

    api.registerRestRoute("submit", { POST: handleSubmit });

    api.registerRestRoute("entries.csv", {
      async GET(_request, ctx) {
        if (!ctx.user || !can(ctx.user, "moderate_comments")) {
          return Response.json({ error: "Authentication required" }, { status: 401 });
        }
        const rows = await all(
          db().prepare("SELECT * FROM vp_form_entries ORDER BY created_at DESC LIMIT 2000"),
          (r) => r,
        );
        const keys = new Set<string>(["id", "form_id", "status", "created_at"]);
        for (const row of rows) {
          const data = JSON.parse(str(row, "data") || "{}") as Record<string, string>;
          Object.keys(data).forEach((k) => keys.add(k));
        }
        const columns = [...keys];
        const lines = [columns.join(",")];
        for (const row of rows) {
          const data = JSON.parse(str(row, "data") || "{}") as Record<string, string>;
          lines.push(
            columns
              .map((column) =>
                csvCell(
                  column in data ? data[column] : (row[column] !== undefined ? str(row, column) : ""),
                ),
              )
              .join(","),
          );
        }
        return new Response(lines.join("\n"), {
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": 'attachment; filename="formsmith-entries.csv"',
          },
        });
      },
    });

    api.registerAdminPage({
      title: "Formsmith",
      description: "Form submissions and schemas",
      capability: "editor",
      async render({ press, searchParams }) {
        const statusFilter = ["new", "read", "trash", "all"].includes(searchParams.status ?? "")
          ? (searchParams.status as string)
          : "new";
        const where = statusFilter === "all" ? "" : "WHERE status = ?1";
        const rows = await all(
          db()
            .prepare(`SELECT * FROM vp_form_entries ${where} ORDER BY created_at DESC LIMIT 200`)
            .bind(...(statusFilter === "all" ? [] : [statusFilter])),
          (r) => ({
            id: num(r, "id"),
            formId: str(r, "form_id"),
            status: str(r, "status"),
            createdAt: str(r, "created_at"),
            data: str(r, "data"),
          }),
        );
        const counts = await all(
          db().prepare("SELECT status, COUNT(*) AS n FROM vp_form_entries GROUP BY status"),
          (r) => ({ status: str(r, "status"), n: num(r, "n") }),
        );
        const countMap = Object.fromEntries(counts.map((c) => [c.status, c.n]));
        const forms = await loadForms();
        const schemaJson = await getOption("formsmith_forms", "");

        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Formsmith</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Submissions inbox. Embed forms with{" "}
                  <code className="vp-font-mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    [form id=&quot;contact&quot;]
                  </code>
                  .
                </p>
              </div>
              <a
                href="/api/v1/ext/formsmith/entries.csv"
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Export CSV
              </a>
            </div>

            {searchParams.schema === "saved" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                Form schemas saved.
              </div>
            ) : null}
            {searchParams.schema === "invalid-json" || searchParams.schema === "invalid-shape" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                Schema rejected: provide a valid JSON object mapping form id → definition.
              </div>
            ) : null}
            {searchParams.deleted ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                Entry deleted.
              </div>
            ) : null}

            <div className="flex gap-2 text-xs font-medium">
              {["new", "read", "trash", "all"].map((key) => (
                <a
                  key={key}
                  href={`/admin/ext/formsmith?status=${key}`}
                  className={`rounded-full border px-3 py-1 capitalize ${
                    statusFilter === key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {key}
                  {key !== "all" ? ` (${countMap[key] ?? 0})` : ""}
                </a>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">No entries in this view.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const data = JSON.parse(row.data || "{}") as Record<string, string>;
                    const summary = Object.entries(data)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ");
                    return (
                      <li key={row.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="vp-font-mono rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                              {row.formId}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                row.status === "new"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : row.status === "read"
                                    ? "border-slate-200 bg-slate-100 text-slate-600"
                                    : "border-red-200 bg-red-50 text-red-600"
                              }`}
                            >
                              {row.status}
                            </span>
                            <span className="text-xs text-slate-400">{row.createdAt} UTC</span>
                          </p>
                          <p className="mt-1 truncate text-sm text-slate-600">{summary}</p>
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-700">
                              Full submission
                            </summary>
                            <dl className="mt-2 grid gap-1 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
                              {Object.entries(data).map(([k, v]) => (
                                <div key={k}>
                                  <dt className="font-semibold text-slate-500">{k}</dt>
                                  <dd className="whitespace-pre-wrap text-slate-700">{v}</dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                          {row.status !== "read" ? (
                            <form action={setEntryStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="read" />
                              <button type="submit" className="font-semibold text-slate-600 hover:text-slate-900">
                                Mark read
                              </button>
                            </form>
                          ) : null}
                          {row.status !== "trash" ? (
                            <form action={setEntryStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="trash" />
                              <button type="submit" className="font-semibold text-amber-600 hover:text-amber-500">
                                Trash
                              </button>
                            </form>
                          ) : (
                            <form action={setEntryStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="new" />
                              <button type="submit" className="font-semibold text-slate-600 hover:text-slate-900">
                                Restore
                              </button>
                            </form>
                          )}
                          <form action={deleteEntryAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button type="submit" className="font-semibold text-slate-400 hover:text-red-600">
                              Delete
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">Form schemas (JSON)</p>
              <p className="mt-1 text-xs text-slate-500">
                Merge your own forms on top of the built-ins ({Object.keys(DEFAULT_FORMS).join(", ")}). Shape:{" "}
                <code className="vp-font-mono text-[11px]">
                  {'{ "form-id": { "title": string, "description"?: string, "fields": [{ name, label, type?, required?, placeholder? }] } }'}
                </code>
              </p>
              <form action={saveFormsSchemaAction} className="mt-3 flex flex-col gap-3">
                <textarea
                  name="schema"
                  rows={10}
                  spellCheck={false}
                  defaultValue={schemaJson || JSON.stringify(DEFAULT_FORMS, null, 2)}
                  className="vp-font-mono w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-800 shadow-sm outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="self-start rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  Save schemas
                </button>
              </form>
              <p className="mt-3 text-[11px] text-slate-400">
                Available forms right now: {Object.keys(forms).join(", ")} · secret-based IP hashing keeps
                submissions GDPR-friendly.
              </p>
            </div>
          </div>
        );
      },
    });
  },
};
