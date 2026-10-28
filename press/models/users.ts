import { all, db, first, num, str } from "../db/client";
import type { User, UserRole } from "../types";
import { nowDb } from "../utils/dates";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: num(row, "id"),
    username: str(row, "username"),
    email: str(row, "email"),
    displayName: str(row, "display_name") || str(row, "username"),
    role: (str(row, "role") || "author") as UserRole,
    createdAt: str(row, "created_at"),
  };
}

const PUBLIC_COLUMNS = "id, username, email, display_name, role, created_at";

export async function listUsers(): Promise<User[]> {
  return all(db().prepare(`SELECT ${PUBLIC_COLUMNS} FROM vp_users ORDER BY id`), mapUser);
}

export async function getUserById(id: number): Promise<User | null> {
  return first(db().prepare(`SELECT ${PUBLIC_COLUMNS} FROM vp_users WHERE id = ?1`).bind(id), mapUser);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return first(
    db().prepare(`SELECT ${PUBLIC_COLUMNS} FROM vp_users WHERE username = ?1 COLLATE NOCASE`).bind(username),
    mapUser,
  );
}

/** Internal: includes the password hash. Never serialize this shape. */
export async function getUserCredentials(username: string): Promise<(User & { passwordHash: string }) | null> {
  return first(
    db()
      .prepare("SELECT id, username, email, display_name, role, created_at, password_hash FROM vp_users WHERE username = ?1 COLLATE NOCASE OR email = ?1 COLLATE NOCASE")
      .bind(username),
    (row) => ({ ...mapUser(row), passwordHash: str(row, "password_hash") }),
  );
}

export async function createUser(input: {
  username: string;
  email: string;
  displayName?: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<User> {
  const result = await db()
    .prepare(
      "INSERT INTO vp_users (username, email, display_name, password_hash, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(
      input.username.trim(),
      input.email.trim().toLowerCase(),
      input.displayName?.trim() || input.username.trim(),
      input.passwordHash,
      input.role ?? "author",
      nowDb(),
    )
    .run();
  return (await getUserById(Number(result.meta.last_row_id)))!;
}

export async function updateUser(
  id: number,
  patch: { displayName?: string; email?: string; role?: UserRole; passwordHash?: string },
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (patch.displayName !== undefined) {
    params.push(patch.displayName);
    fields.push(`display_name = ?${params.length}`);
  }
  if (patch.email !== undefined) {
    params.push(patch.email.toLowerCase());
    fields.push(`email = ?${params.length}`);
  }
  if (patch.role !== undefined) {
    params.push(patch.role);
    fields.push(`role = ?${params.length}`);
  }
  if (patch.passwordHash !== undefined) {
    params.push(patch.passwordHash);
    fields.push(`password_hash = ?${params.length}`);
  }
  if (!fields.length) return;
  params.push(id);
  await db()
    .prepare(`UPDATE vp_users SET ${fields.join(", ")} WHERE id = ?${params.length}`)
    .bind(...(params as never[]))
    .run();
}

export async function deleteUser(id: number): Promise<void> {
  await db().prepare("DELETE FROM vp_users WHERE id = ?1").bind(id).run();
}

export async function countUsers(): Promise<number> {
  const row = await db().prepare("SELECT COUNT(*) AS n FROM vp_users").first();
  return num((row ?? {}) as Record<string, unknown>, "n");
}

/** Coarse role hierarchy used by capability checks. */
const ROLE_LEVEL: Record<UserRole, number> = { author: 1, editor: 2, administrator: 3 };

export function roleAtLeast(user: Pick<User, "role">, minimum: UserRole): boolean {
  return ROLE_LEVEL[user.role] >= ROLE_LEVEL[minimum];
}
