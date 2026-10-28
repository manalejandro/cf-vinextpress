"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Dashboard navigation. A client component so it can highlight the
 * active section with usePathname, and show a pending-comments badge.
 */

interface NavItem {
  href: string;
  label: string;
  match: RegExp;
  icon: string;
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", match: /^\/admin\/?$/, icon: "▦" },
  { href: "/admin/posts", label: "Posts", match: /^\/admin\/posts/, icon: "✎" },
  { href: "/admin/pages", label: "Pages", match: /^\/admin\/pages/, icon: "▤" },
  { href: "/admin/comments", label: "Comments", match: /^\/admin\/comments/, icon: "💬" },
  { href: "/admin/media", label: "Media", match: /^\/admin\/media/, icon: "🖼" },
  { href: "/admin/appearance", label: "Appearance", match: /^\/admin\/appearance/, icon: "◐" },
  { href: "/admin/plugins", label: "Plugins", match: /^\/admin\/plugins/, icon: "⚡" },
  { href: "/admin/users", label: "Users", match: /^\/admin\/users/, icon: "👤" },
  { href: "/admin/settings", label: "Settings", match: /^\/admin\/settings/, icon: "⚙" },
];

export function AdminNav({ className, horizontal }: { className?: string; horizontal?: boolean }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/comments?status=pending&per_page=1")
      .then((r) => (r.ok ? Number(r.headers.get("x-total") ?? 0) : 0))
      .then((n) => {
        if (!cancelled) setPending(n > 0 ? n : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <nav aria-label="Dashboard" className={className}>
      <ul className={horizontal ? "flex items-center gap-1" : "flex flex-col gap-0.5"}>
        {ITEMS.map((item) => {
          const active = item.match.test(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  horizontal
                    ? active
                      ? "bg-slate-900 text-white"
                      : "hover:bg-slate-100"
                    : active
                      ? "bg-slate-800 text-white"
                      : "hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span aria-hidden="true" className="w-4 text-center text-xs opacity-80">
                  {item.icon}
                </span>
                {item.label}
                {item.href === "/admin/comments" && pending ? (
                  <span className="ml-auto rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pending}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
