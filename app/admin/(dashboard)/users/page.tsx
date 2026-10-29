import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getCurrentUser } from "@/press/auth";
import { listUsers } from "@/press/models/users";
import { formatDate } from "@/press/utils/dates";
import { createUserAction, deleteUserAction, updateUserAction } from "../../actions";
import { ConfirmSubmitButton } from "../../components/confirm-button";
import { BTN_PRIMARY, BTN_SECONDARY, Card, Flash, INPUT, LABEL, PageHeader, Td, Th } from "../../components/ui";
import type { UserRole } from "@/press/types";

export const metadata: Metadata = { title: "Users" };

const ROLES: UserRole[] = ["administrator", "editor", "author"];

const ROLE_BADGE: Record<UserRole, string> = {
  administrator: "bg-orange-50 text-orange-700 border-orange-200",
  editor: "bg-sky-50 text-sky-700 border-sky-200",
  author: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const current = (await getCurrentUser())!;
  if (!can(current, "manage_users")) notFound();

  const users = await listUsers();
  const editId = Number(sp.edit ?? 0) || null;
  const editUser = editId ? (users.find((u) => u.id === editId) ?? null) : null;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Administrators manage everything; editors moderate and edit all content; authors manage their own posts."
        actions={
          editUser ? (
            <Link href="/admin/users" className={BTN_SECONDARY}>
              ← Back to list
            </Link>
          ) : undefined
        }
      />

      {sp.created ? <Flash>User created.</Flash> : null}
      {sp.updated ? <Flash>User updated.{sp.self ? " (your own account)" : ""}</Flash> : null}
      {sp.deleted ? <Flash tone="warn">User deleted. Their published content stays online.</Flash> : null}

      {editUser ? (
        <Card title={`Edit user — ${editUser.username}`} className="max-w-2xl">
          <form action={updateUserAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editUser.id} />

            <label>
              <span className={LABEL}>Display name</span>
              <input name="display_name" defaultValue={editUser.displayName} required maxLength={120} className={INPUT} />
            </label>

            <label>
              <span className={LABEL}>Email</span>
              <input name="email" type="email" defaultValue={editUser.email} required maxLength={190} className={INPUT} />
            </label>

            <label>
              <span className={LABEL}>Role</span>
              <select name="role" defaultValue={editUser.role} className={INPUT}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {editUser.id === current.id ? (
                <span className="mt-1 block text-[11px] text-slate-400">You cannot demote your own account.</span>
              ) : null}
            </label>

            <label>
              <span className={LABEL}>New password</span>
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="Leave blank to keep the current one"
                className={INPUT}
              />
              <span className="mt-1 block text-[11px] text-slate-400">8+ characters. Existing sessions stay valid.</span>
            </label>

            <div className="flex items-center gap-3 sm:col-span-2">
              <button type="submit" className={BTN_PRIMARY}>
                Save changes
              </button>
              <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-800">
                Cancel
              </Link>
            </div>
          </form>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            Usernames are immutable account identifiers. Changing the password takes effect on the next sign-in for
            other devices.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <Th>Username</Th>
                  <Th className="hidden sm:table-cell">Display name</Th>
                  <Th className="hidden md:table-cell">Email</Th>
                  <Th>Role</Th>
                  <Th className="hidden lg:table-cell">Joined</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <Td>
                      <span className="font-semibold text-slate-900">{u.username}</span>
                      {u.id === current.id ? <span className="ml-2 text-[10px] text-slate-400">(you)</span> : null}
                    </Td>
                    <Td className="hidden sm:table-cell">{u.displayName}</Td>
                    <Td className="hidden text-slate-500 md:table-cell">{u.email}</Td>
                    <Td>
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </Td>
                    <Td className="hidden whitespace-nowrap text-slate-500 lg:table-cell">{formatDate(u.createdAt, "short")}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <Link href={`/admin/users?edit=${u.id}`} className="font-semibold text-orange-600 hover:text-orange-500">
                          Edit
                        </Link>
                        {u.id !== current.id ? (
                          <>
                            <form id={`delete-user-${u.id}`} action={deleteUserAction} className="hidden">
                              <input type="hidden" name="id" value={u.id} />
                            </form>
                            <ConfirmSubmitButton
                              formId={`delete-user-${u.id}`}
                              label="Delete"
                              message={`Delete ${u.username}? Their published content stays online.`}
                              className="font-medium text-slate-400 hover:text-red-600"
                            />
                          </>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card title="Add a new user">
            <form action={createUserAction} className="flex flex-col gap-3">
              <label>
                <span className={LABEL}>Username</span>
                <input name="username" required minLength={3} maxLength={60} className={INPUT} />
              </label>
              <label>
                <span className={LABEL}>Email</span>
                <input name="email" type="email" required className={INPUT} />
              </label>
              <label>
                <span className={LABEL}>Password (8+ characters)</span>
                <input name="password" type="password" required minLength={8} className={INPUT} />
              </label>
              <label>
                <span className={LABEL}>Role</span>
                <select name="role" defaultValue="author" className={INPUT}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={`${BTN_PRIMARY} mt-1`}>
                Create user
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
