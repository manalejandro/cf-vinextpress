import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/press/auth";
import { roleAtLeast } from "@/press/models/users";
import { getPress } from "@/press/context";

/**
 * Host route for plugin-registered dashboard screens: /admin/ext/<plugin-slug>.
 * Capability defaults to administrator; plugins may lower it per page.
 */

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ plugin: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { plugin } = await params;
  const press = await getPress();
  const page = press.adminPages.get(plugin);
  return { title: page ? `${page.title} – Dashboard` : "Extension" };
}

export default async function PluginAdminPage({ params, searchParams }: Props) {
  const { plugin } = await params;
  const rawParams = await searchParams;
  const press = await getPress();
  const user = await getCurrentUser();
  if (!user) notFound();

  const page = press.adminPages.get(plugin);
  if (!page || !press.activePlugins.has(plugin)) notFound();
  if (!roleAtLeast(user, page.capability ?? "administrator")) notFound();

  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") flat[key] = value[0];
  }

  const content = await page.render({ press, user, searchParams: flat });

  return <div className="min-w-0">{content}</div>;
}
