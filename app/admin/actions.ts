"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPress } from "@/press/context";
import { freshSettings, setOption } from "@/press/options";
import { can, canEditPost, getCurrentUser, hashPassword, requireUser, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifyPassword } from "@/press/auth";
import { getUserCredentials, createUser, deleteUser, listUsers, updateUser, countUsers } from "@/press/models/users";
import { installSite } from "@/press/install";
import { CoreHooks } from "@/press/hooks";
import {
  deletePostPermanently,
  getPostById,
  restorePost,
  savePost,
  trashPost,
} from "@/press/models/posts";
import { deleteComment, getCommentById, setCommentStatus } from "@/press/models/comments";
import { deleteMedia, uploadMedia, updateMedia } from "@/press/models/media";
import { createTerm, listTerms } from "@/press/models/terms";
import { revalidateSite, revalidatePage } from "@/press/cache";
import { isReservedSlug, slugify } from "@/press/utils/slug";
import type { CommentStatus, PermalinkStructure, PostStatus, UserRole } from "@/press/types";

/**
 * Every dashboard mutation is a server action: authentication, validation,
 * persistence, hook dispatch and cache invalidation in one place.
 */

export interface FormState {
  error?: string;
  message?: string;
}

async function assertInstalled(): Promise<void> {
  const settings = await freshSettings();
  if (!settings.installed) redirect("/admin/install");
}

/* ------------------------------------------------------------------ auth */

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const creds = await getUserCredentials(username);
  if (!creds || !(await verifyPassword(password, creds.passwordHash))) {
    return { error: "Invalid credentials. Please try again." };
  }

  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await signSession(creds.id, creds.role, expires);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  const intended = String(formData.get("redirect_to") ?? "") || "/admin";
  redirect(intended.startsWith("/admin") ? intended : "/admin");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* --------------------------------------------------------------- install */

export async function installAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (await countUsers() > 0) {
    const settings = await freshSettings();
    if (settings.installed) return { error: "This site is already installed." };
  }

  const siteTitle = String(formData.get("site_title") ?? "").trim();
  const siteTagline = String(formData.get("site_tagline") ?? "").trim();
  const adminUsername = String(formData.get("admin_username") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim();
  const adminPassword = String(formData.get("admin_password") ?? "");
  const siteUrl = String(formData.get("site_url") ?? "").trim().replace(/\/+$/, "");

  if (!siteTitle) return { error: "Choose a site title." };
  if (!/^[a-zA-Z0-9 ._@-]{3,60}$/.test(adminUsername)) {
    return { error: "Username must be 3–60 characters (letters, numbers, spaces, . _ @ -)." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return { error: "Enter a valid admin email." };
  if (adminPassword.length < 8) return { error: "Password must be at least 8 characters." };
  if (siteUrl && !/^https?:\/\/[^\s]+$/i.test(siteUrl)) return { error: "Site URL must start with http:// or https://" };

  await installSite({
    siteTitle,
    siteTagline: siteTagline || undefined,
    adminUsername,
    adminEmail,
    adminPassword,
    siteUrl: siteUrl || undefined,
  });

  // Sign the fresh administrator straight in.
  const creds = await getUserCredentials(adminUsername);
  if (creds) {
    const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
    const token = await signSession(creds.id, creds.role, expires);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  revalidateSite();
  redirect("/admin?installed=1");
}

/* ------------------------------------------------------------ posts/pages */

function statusFromForm(formData: FormData): PostStatus {
  if (formData.get("save_draft") === "1") return "draft";
  const status = String(formData.get("status") ?? "draft");
  return (["publish", "draft", "private", "trash"] as PostStatus[]).includes(status as PostStatus)
    ? (status as PostStatus)
    : "draft";
}

export async function savePostAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("author");
  const press = await getPress();

  const id = Number(formData.get("id") ?? 0) || undefined;
  const type = String(formData.get("type") ?? "post") === "page" ? "page" : ("post" as const);
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  if (!title) throw new Error("A title is required.");

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugRaw || title);
  if (slug && isReservedSlug(slug)) throw new Error("That slug is reserved by the platform.");

  const status = statusFromForm(formData);
  if (status === "publish" && !can(user, "publish_posts")) throw new Error("You are not allowed to publish.");

  const existing = id ? await getPostById(id) : null;
  if (existing) {
    if (existing.type !== type) throw new Error("Post type mismatch.");
    if (!canEditPost(user, existing)) throw new Error("You can only edit your own posts.");
  }

  const categoryIds: number[] = [];
  for (const value of formData.getAll("categories")) {
    const n = Number(value);
    if (Number.isInteger(n)) categoryIds.push(n);
  }
  // New categories typed inline ("+ New category" field, comma separated).
  const newCategories = String(formData.get("new_categories") ?? "");
  for (const name of newCategories.split(",")) {
    if (!name.trim()) continue;
    const term = await createTerm("category", name.trim());
    categoryIds.push(term.id);
  }
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50);

  const saved = await savePost({
    id,
    type,
    title,
    slug: slug || undefined,
    content: String(formData.get("content") ?? ""),
    contentFormat: String(formData.get("content_format") ?? "markdown") === "html" ? "html" : "markdown",
    excerpt: String(formData.get("excerpt") ?? "").slice(0, 1000),
    status,
    authorId: existing?.authorId ?? user.id,
    parentId: type === "page" ? Number(formData.get("parent_id") ?? 0) || null : null,
    menuOrder: Number(formData.get("menu_order") ?? 0) || 0,
    commentStatus: String(formData.get("comment_status") ?? "open") === "closed" ? "closed" : "open",
    featuredMediaId: Number(formData.get("featured_media_id") ?? 0) || null,
    categories: type === "post" ? categoryIds : undefined,
    tags: type === "post" ? tags : undefined,
  });

  await press.doAction(CoreHooks.PostSaved, [saved, existing]);
  revalidateSite();

  const message = status === "publish" ? "published" : status === "trash" ? "trashed" : "saved";
  redirect(`/admin/${type === "post" ? "posts" : "pages"}/${saved.id}?saved=${message}`);
}

export async function trashPostAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("author");
  const id = Number(formData.get("id") ?? 0);
  const post = await getPostById(id);
  if (!post) redirect("/admin/posts");
  if (!canEditPost(user, post)) throw new Error("You can only manage your own posts.");
  await trashPost(id);
  revalidateSite();
  redirect(`/admin/${post.type === "post" ? "posts" : "pages"}?trashed=1`);
}

export async function restorePostAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("author");
  const id = Number(formData.get("id") ?? 0);
  const post = await getPostById(id);
  if (!post) redirect("/admin/posts");
  if (!canEditPost(user, post)) throw new Error("You can only manage your own posts.");
  await restorePost(id, post.publishedAt ? "publish" : "draft");
  revalidateSite();
  redirect(`/admin/${post.type === "post" ? "posts" : "pages"}?status=trash`);
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("editor");
  const id = Number(formData.get("id") ?? 0);
  const post = await getPostById(id);
  if (!post) redirect("/admin/posts");
  if (!canEditPost(user, post)) throw new Error("You can only delete your own posts.");
  const press = await getPress();
  await deletePostPermanently(id);
  await press.doAction(CoreHooks.PostDeleted, [post]);
  revalidateSite();
  redirect(`/admin/${post.type === "post" ? "posts" : "pages"}?deleted=1`);
}

export async function quickDraftAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("author");
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  if (!title) redirect("/admin");
  const saved = await savePost({ type: "post", title, status: "draft", authorId: user.id });
  redirect(`/admin/posts/${saved.id}?saved=draft`);
}

/* --------------------------------------------------------------- comments */

export async function moderateCommentAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("editor");
  if (!can(user, "moderate_comments")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  const status = String(formData.get("status") ?? "") as CommentStatus;
  if (!["approved", "pending", "spam", "trash"].includes(status)) throw new Error("Invalid status.");
  const comment = await getCommentById(id);
  if (!comment) redirect("/admin/comments");
  await setCommentStatus(id, status);

  if (status === "approved" || comment.status === "approved") {
    const post = await getPostById(comment.postId);
    if (post) {
      const press = await getPress();
      revalidatePage(await press.permalink(post));
    }
  }
  const back = String(formData.get("back") ?? "/admin/comments");
  redirect(back.startsWith("/admin/comments") ? back : "/admin/comments");
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("editor");
  if (!can(user, "moderate_comments")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  const comment = await getCommentById(id);
  if (!comment) redirect("/admin/comments");
  await deleteComment(id);
  if (comment.status === "approved") {
    const post = await getPostById(comment.postId);
    if (post) {
      const press = await getPress();
      revalidatePage(await press.permalink(post));
    }
  }
  redirect("/admin/comments?deleted=1");
}

/* ------------------------------------------------------------------ media */

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function uploadMediaAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("author");
  if (!can(user, "upload_files")) throw new Error("Insufficient permissions.");
  const press = await getPress();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) redirect("/admin/media?error=no-file");

  let uploaded = 0;
  for (const file of files.slice(0, 10)) {
    if (file.size > MAX_UPLOAD_BYTES) continue;
    const item = await uploadMedia(file, user.id);
    await press.doAction(CoreHooks.MediaUploaded, [item]);
    uploaded++;
  }
  redirect(`/admin/media?uploaded=${uploaded}`);
}

export async function updateMediaAction(formData: FormData): Promise<void> {
  await assertInstalled();
  await requireUser("author");
  const id = Number(formData.get("id") ?? 0);
  await updateMedia(id, {
    alt: String(formData.get("alt") ?? "").slice(0, 500),
    caption: String(formData.get("caption") ?? "").slice(0, 1000),
  });
  redirect("/admin/media?updated=1");
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("author");
  if (!can(user, "upload_files")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  await deleteMedia(id);
  redirect("/admin/media?deleted=1");
}

/* -------------------------------------------------------- settings/appearance */

export async function saveSettingsAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("administrator");
  if (!can(user, "manage_options")) throw new Error("Insufficient permissions.");

  const siteUrl = String(formData.get("site_url") ?? "").trim().replace(/\/+$/, "");
  if (siteUrl && !/^https?:\/\/[^\s]+$/i.test(siteUrl)) throw new Error("Site URL must start with http(s)://");
  const permalink = String(formData.get("permalink_structure") ?? "post-name");
  if (!["post-name", "date"].includes(permalink)) throw new Error("Unknown permalink structure.");
  const perPage = Math.min(50, Math.max(1, Number(formData.get("posts_per_page") ?? 10) || 10));
  const showOnFront = String(formData.get("show_on_front") ?? "posts") === "page" ? "page" : "posts";

  const writes: Record<string, string> = {
    site_title: String(formData.get("site_title") ?? "").trim().slice(0, 120) || "VinextPress",
    site_tagline: String(formData.get("site_tagline") ?? "").trim().slice(0, 240),
    admin_email: String(formData.get("admin_email") ?? "").trim().slice(0, 190),
    site_url: siteUrl,
    permalink_structure: permalink as PermalinkStructure,
    posts_per_page: String(perPage),
    show_on_front: showOnFront,
    page_on_front: showOnFront === "page" ? String(Number(formData.get("page_on_front") ?? 0) || "") : "",
    page_for_posts: showOnFront === "page" ? String(Number(formData.get("page_for_posts") ?? 0) || "") : "",
    comment_moderation: String(formData.get("comment_moderation") ?? "manual") === "auto" ? "auto" : "manual",
    require_name_email: formData.get("require_name_email") ? "1" : "0",
  };

  for (const [name, value] of Object.entries(writes)) {
    await setOption(name, value);
  }
  revalidateSite();
  redirect("/admin/settings?saved=1");
}

export async function activateThemeAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("administrator");
  if (!can(user, "switch_themes")) throw new Error("Insufficient permissions.");
  const slug = String(formData.get("slug") ?? "");
  const { listThemes } = await import("@/press/themes/registry");
  if (!listThemes().some((t) => t.manifest.slug === slug)) throw new Error("Unknown theme.");
  await setOption("active_theme", slug);
  revalidateSite();
  redirect(`/admin/appearance?theme=${encodeURIComponent(slug)}`);
}

export async function saveNavMenuAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("administrator");
  if (!can(user, "manage_options")) throw new Error("Insufficient permissions.");

  const items: Array<{ label: string; url: string }> = [];
  const labels = formData.getAll("menu_label").map((v) => String(v).trim());
  const urls = formData.getAll("menu_url").map((v) => String(v).trim());
  for (let i = 0; i < labels.length && items.length < 30; i++) {
    const label = labels[i]!;
    const url = urls[i] || "/";
    if (!label) continue;
    items.push({ label: label.slice(0, 60), url: url.slice(0, 300) });
  }
  await setOption("nav_menu", JSON.stringify(items));
  revalidateSite();
  redirect("/admin/appearance?menu=saved");
}

export async function togglePluginAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const user = await requireUser("administrator");
  if (!can(user, "manage_plugins")) throw new Error("Insufficient permissions.");
  const slug = String(formData.get("slug") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  const { getPlugin } = await import("@/press/plugins/registry");
  if (!getPlugin(slug)) throw new Error("Unknown plugin.");

  const settings = await freshSettings();
  const set = new Set(settings.activePlugins);
  if (active) set.add(slug);
  else set.delete(slug);
  await setOption("active_plugins", JSON.stringify([...set]));
  revalidateSite();
  redirect(`/admin/plugins?${active ? "enabled" : "disabled"}=${encodeURIComponent(slug)}`);
}

/* ------------------------------------------------------------------ users */

export async function createUserAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const current = await requireUser("administrator");
  if (!can(current, "manage_users")) throw new Error("Insufficient permissions.");

  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "author") as UserRole;
  if (!username || !email || password.length < 8) throw new Error("username, email and a password (8+ chars) are required.");
  if (!["administrator", "editor", "author"].includes(role)) throw new Error("Unknown role.");

  await createUser({ username, email, passwordHash: await hashPassword(password), role });
  redirect("/admin/users?created=1");
}

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const current = await requireUser("administrator");
  if (!can(current, "manage_users")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!["administrator", "editor", "author"].includes(role)) throw new Error("Unknown role.");
  if (id === current.id && role !== "administrator") throw new Error("You cannot demote your own account.");
  await updateUser(id, { role });
  redirect("/admin/users?updated=1");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  await assertInstalled();
  const current = await requireUser("administrator");
  if (!can(current, "manage_users")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  if (id === current.id) throw new Error("You cannot delete your own account.");
  const users = await listUsers();
  if (!users.some((u) => u.id === id)) throw new Error("User not found.");
  await deleteUser(id);
  redirect("/admin/users?deleted=1");
}
