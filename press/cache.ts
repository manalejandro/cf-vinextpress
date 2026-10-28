import { revalidatePath } from "next/cache";

/**
 * Cache invalidation helpers.
 *
 * Content mutations purge the whole frontend tree. Two calls are needed
 * for full coverage: the "layout" scope from the root invalidates every
 * nested path, and the page-scope root tag covers the front page entry
 * itself, which the layout tag alone can miss. The Response Store drops
 * the stored responses and the next visitor regenerates them on demand.
 */
export function revalidateSite(): void {
  revalidatePath("/", "layout");
  revalidatePath("/");
}

/** Targeted purge for a single public path (comments, quick edits). */
export function revalidatePage(path: string): void {
  revalidatePath(path);
}
