/** Date helpers. Stored timestamps are UTC ("YYYY-MM-DD HH:MM:SS" or ISO). */

export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function nowDb(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function formatDate(value: string | null | undefined, style: "long" | "short" | "time" = "long"): string {
  const date = parseDbDate(value);
  if (!date) return "";
  if (style === "time") {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  }
  if (style === "short") {
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDbDate(value);
  if (!date) return "";
  return `${date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })} at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}`;
}

/** "3 hours ago"-style relative time for the dashboard. */
export function timeAgo(value: string | null | undefined): string {
  const date = parseDbDate(value);
  if (!date) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const steps: Array<[number, number, string]> = [
    [60, 1, "second"],
    [3600, 60, "minute"],
    [86400, 3600, "hour"],
    [2592000, 86400, "day"],
    [31536000, 2592000, "month"],
  ];
  let n = seconds;
  let label = "second";
  for (const [limit, divisor, unit] of steps) {
    if (seconds < limit) {
      n = Math.floor(seconds / divisor);
      label = unit;
      break;
    }
    n = Math.floor(seconds / divisor);
    label = unit;
  }
  if (seconds < 60) return "just now";
  return `${n} ${label}${n === 1 ? "" : "s"} ago`;
}

export function isoDate(value: string | null | undefined): string {
  const date = parseDbDate(value);
  return date ? date.toISOString() : new Date().toISOString();
}
