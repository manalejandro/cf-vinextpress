import { env } from "cloudflare:workers";

/**
 * Typed view of the bindings VinextPress expects on the Worker.
 * The generated `.cloudflare/types` keep `env` in sync with
 * `cloudflare.config.ts`; this interface documents the contract for
 * the core engine and keeps it testable in isolation.
 */
export interface PressEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES?: ImagesBinding;
}

export function pressEnv(): PressEnv {
  const e = env as unknown as PressEnv;
  if (!e.DB) {
    throw new Error(
      "VinextPress requires a D1 binding named DB. See cloudflare.config.ts.",
    );
  }
  return e;
}

export function db(): D1Database {
  return pressEnv().DB;
}

/** Row shape helpers: D1 returns snake_case columns; models map to camelCase. */
export function mapRows<T>(result: D1Result<Record<string, unknown>>, map: (row: Record<string, unknown>) => T): T[] {
  return result.results.map(map);
}

export async function all<T>(stmt: D1PreparedStatement, map: (row: Record<string, unknown>) => T): Promise<T[]> {
  const result = await stmt.all<Record<string, unknown>>();
  return mapRows(result, map);
}

export async function first<T>(stmt: D1PreparedStatement, map: (row: Record<string, unknown>) => T): Promise<T | null> {
  const row = await stmt.first<Record<string, unknown>>();
  return row ? map(row) : null;
}

export function str(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  return v === null || v === undefined ? "" : String(v);
}

export function num(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  return typeof v === "number" ? v : Number(v ?? 0);
}

export function nullableNum(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : Number(v);
}

export function nullableStr(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return v === null || v === undefined ? null : String(v);
}

export function bool(row: Record<string, unknown>, key: string): boolean {
  const v = row[key];
  return v === 1 || v === "1" || v === true;
}
