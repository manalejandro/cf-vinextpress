import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can, getCurrentUser } from "@/press/auth";
import { listUsers } from "@/press/models/users";
import { formatDate } from "@/press/utils/dates";
import { createUserAction, deleteUserAction, updateUserRoleAction } from "../../actions";
import { ConfirmSubmitButton } from "../../components/confirm-button";
import { BTN_PRIMARY, Card, Flash, INPUT, LABEL, PageHeader, Td, Th } from "../../components/ui";
import type { UserRole } from "@/press/types";

export const metadata: Metadata = { title: "Users" };

const ROLES: UserRole[] = ["administrator", "editor", "author"];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const current = (await getCurrentUser())!;
  if (!can(current, "manage_users")) notFound();

  const users = await listUsers();

  return (
    <div>
      <PageHeader title="Users" description="Administrators manage everything; editors moderate and edit all content; authors manage their own posts." />

      {sp.created ? <Flash>User created.</Flash> : null}
      {sp.updated ? <Flash>Role updated.</Flash> : null}
      {sp.deleted ? <Flash tone="warn">User deleted. Their posts remain, attributed to the removed account id.</Flash> : null}

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
                    <form action={updateUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm">
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="text-xs font-semibold text-orange-600 hover:text-orange-500">
                        Save
                      </button>
                    </form>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-slate-500 lg:table-cell">{formatDate(u.createdAt, "short")}</Td>
                  <Td>
                    {u.id !== current.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <form id={`delete-user-${u.id}`} action={deleteUserAction} className="hidden">
                          <input type="hidden" name="id" value={u.id} />
                        </form>
                        <ConfirmSubmitButton
                          formId={`delete-user-${u.id}`}
                          label="Delete"
                          message={`Delete ${u.username}? Their published content stays online.`}
                          className="text-xs font-medium text-slate-400 hover:text-red-600"
                        />
                      </div>
                    ) : null}
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
    </div>
  );
}
