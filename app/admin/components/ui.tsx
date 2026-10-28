import type { ReactNode } from "react";

/** Shared dashboard UI atoms. Styling is plain Tailwind — no client JS. */

export const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-50";
export const BTN_ACCENT =
  "inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:opacity-50";
export const BTN_SECONDARY =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50";
export const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30";
export const LABEL = "block text-xs font-semibold text-slate-600 mb-1.5";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
  footer,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title ? (
        <header className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">
          {title}
        </header>
      ) : null}
      <div className="px-5 py-4">{children}</div>
      {footer ? <footer className="border-t border-slate-100 px-5 py-3">{footer}</footer> : null}
    </section>
  );
}

export function Flash({ tone = "ok", children }: { tone?: "ok" | "warn" | "error"; children: ReactNode }) {
  const styles = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
  } as const;
  return <div className={`mb-5 rounded-lg border px-4 py-2.5 text-sm ${styles[tone]}`}>{children}</div>;
}

const PILL_STYLES: Record<string, string> = {
  publish: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  private: "bg-sky-50 text-sky-700 border-sky-200",
  spam: "bg-red-50 text-red-600 border-red-200",
  trash: "bg-slate-100 text-slate-500 border-slate-200",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
        PILL_STYLES[status] ?? PILL_STYLES.draft
      }`}
    >
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-5 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <a className={BTN_SECONDARY} href={hrefFor(page - 1)}>
          ← Prev
        </a>
      ) : null}
      <span className="text-xs text-slate-500">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <a className={BTN_SECONDARY} href={hrefFor(page + 1)}>
          Next →
        </a>
      ) : null}
    </nav>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-slate-700 ${className}`}>{children}</td>;
}
