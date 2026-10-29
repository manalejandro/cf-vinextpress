import { can, requireUser, HttpError } from "@/press/auth";
import { createUser, deleteUser, listUsers, updateUser } from "@/press/models/users";
import { hashPassword } from "@/press/auth";
import { handleRest, json, serializeUser } from "@/press/rest";
import type { UserRole } from "@/press/types";

export const dynamic = "force-dynamic";

const ROLES: UserRole[] = ["administrator", "editor", "author"];

/** GET /api/v1/users — authenticated; administrators see emails. */
export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const user = await requireUser("author");
    const users = await listUsers();
    const isAdmin = can(user, "manage_users");
    return json(
      users.map((u) => {
        const serialized = serializeUser(u);
        if (!isAdmin) delete serialized.email;
        return serialized;
      }),
    );
  });
}

/** POST /api/v1/users — administrators create users. */
export async function POST(request: Request): Promise<Response> {
  return handleRest(async () => {
    const current = await requireUser("administrator");
    if (!can(current, "manage_users")) throw new HttpError(403, "Insufficient permissions");

    const body = (await request.json().catch(() => null)) as {
      username?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      display_name?: string;
    } | null;

    const username = body?.username?.trim();
    const email = body?.email?.trim();
    const password = body?.password ?? "";
    if (!username || !email || password.length < 8) {
      throw new HttpError(400, "username, email and a password of at least 8 characters are required");
    }
    const role = body?.role && ROLES.includes(body.role) ? body.role : "author";

    const created = await createUser({
      username,
      email,
      displayName: body?.display_name?.trim() || username,
      passwordHash: await hashPassword(password),
      role,
    });
    return json(serializeUser(created), { status: 201 });
  });
}

/** DELETE is exposed per-user through /api/v1/users/me or the dashboard; keep it explicit here for admins. */
export async function DELETE(request: Request): Promise<Response> {
  return handleRest(async () => {
    const current = await requireUser("administrator");
    if (!can(current, "manage_users")) throw new HttpError(403, "Insufficient permissions");
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id") ?? 0);
    if (!id || id === current.id) throw new HttpError(400, "Provide ?id= of another user");
    const users = await listUsers();
    if (!users.some((u) => u.id === id)) throw new HttpError(404, "User not found");
    await deleteUser(id);
    return json({ deleted: id });
  });
}

/** PATCH /api/v1/users — update profile fields.
 * Self-service: display_name, email, password.
 * Administrators may also pass `id` to target another user and change `role`. */
export async function PATCH(request: Request): Promise<Response> {
  return handleRest(async () => {
    const current = await requireUser("author");
    const body = (await request.json().catch(() => null)) as {
      id?: number;
      display_name?: string;
      email?: string;
      role?: UserRole;
      password?: string;
    } | null;
    if (!body || typeof body !== "object") throw new HttpError(400, "Body must be valid JSON");

    const targetId = Number(body.id ?? current.id);
    if (!Number.isInteger(targetId) || targetId <= 0) throw new HttpError(400, "Invalid id");
    const isSelf = targetId === current.id;
    if (!isSelf && !can(current, "manage_users")) {
      throw new HttpError(403, "You can only update your own profile");
    }

    const users = await listUsers();
    if (!users.some((u) => u.id === targetId)) throw new HttpError(404, "User not found");

    const patch: { displayName?: string; email?: string; role?: UserRole; passwordHash?: string } = {};

    if (body.display_name !== undefined) {
      const name = String(body.display_name).trim().slice(0, 120);
      if (!name) throw new HttpError(400, "display_name cannot be empty");
      patch.displayName = name;
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Invalid email address");
      if (users.some((u) => u.id !== targetId && u.email.toLowerCase() === email)) {
        throw new HttpError(409, "That email is already used by another account");
      }
      patch.email = email;
    }
    if (body.role !== undefined) {
      if (!can(current, "manage_users")) throw new HttpError(403, "Only administrators can change roles");
      if (!ROLES.includes(body.role)) throw new HttpError(400, `role must be one of: ${ROLES.join(", ")}`);
      if (isSelf && body.role !== "administrator") throw new HttpError(400, "You cannot demote your own account");
      patch.role = body.role;
    }
    if (body.password !== undefined) {
      if (String(body.password).length < 8) throw new HttpError(400, "Password must be at least 8 characters");
      patch.passwordHash = await hashPassword(String(body.password));
    }

    if (Object.keys(patch).length === 0) throw new HttpError(400, "No recognized fields to update");

    await updateUser(targetId, patch);
    const updated = (await listUsers()).find((u) => u.id === targetId);
    return json(serializeUser(updated!));
  });
}
