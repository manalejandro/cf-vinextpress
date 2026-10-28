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

/** PATCH /api/v1/users — self-service profile update (display name, password). */
export async function PATCH(request: Request): Promise<Response> {
  return handleRest(async () => {
    const current = await requireUser("author");
    const body = (await request.json().catch(() => null)) as {
      display_name?: string;
      password?: string;
      id?: number;
    } | null;

    const targetId = body?.id ?? current.id;
    if (targetId !== current.id && !can(current, "manage_users")) {
      throw new HttpError(403, "You can only update your own profile");
    }

    await updateUser(targetId, {
      displayName: body?.display_name?.trim() || undefined,
      passwordHash: body?.password && body.password.length >= 8 ? await hashPassword(body.password) : undefined,
    });
    const users = await listUsers();
    const updated = users.find((u) => u.id === targetId);
    if (!updated) throw new HttpError(404, "User not found");
    return json(serializeUser(updated));
  });
}
