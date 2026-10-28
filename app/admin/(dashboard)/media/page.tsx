import type { Metadata } from "next";
import { getPress } from "@/press/context";
import { listMedia, mediaUrl } from "@/press/models/media";
import { formatDateTime } from "@/press/utils/dates";
import { absoluteUrl } from "@/press/permalinks";
import { deleteMediaAction, updateMediaAction, uploadMediaAction } from "../../actions";
import { ConfirmSubmitButton } from "../../components/confirm-button";
import { CopyButton } from "../../components/copy-button";
import { AdminPagination, BTN_ACCENT, EmptyState, Flash, INPUT, LABEL, PageHeader } from "../../components/ui";

export const metadata: Metadata = { title: "Media" };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const press = await getPress();
  const paged = Math.max(1, Number(sp.paged ?? 1) || 1);
  const { items, total } = await listMedia({ page: paged, perPage: 24 });

  return (
    <div>
      <PageHeader title="Media library" description="Files live in R2; URLs are served (and transformed) at the edge." />

      {sp.uploaded ? <Flash>Uploaded {String(sp.uploaded)} file(s).</Flash> : null}
      {sp.updated ? <Flash>Details saved.</Flash> : null}
      {sp.deleted ? <Flash tone="warn">File deleted.</Flash> : null}
      {sp.error ? <Flash tone="error">Upload failed: no file received (25 MB limit per file).</Flash> : null}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={uploadMediaAction} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-56">
            <span className={LABEL}>Choose files (images, PDFs… up to 25 MB each, 10 per upload)</span>
            <input
              type="file"
              name="files"
              multiple
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700"
            />
          </label>
          <button type="submit" className={BTN_ACCENT}>
            Upload
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState title="The library is empty" description="Upload your first image — it can become a featured image or be embedded with the [image] shortcode." />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => {
            const url = mediaUrl(item);
            const fullUrl = press.settings.siteUrl ? absoluteUrl(press.settings.siteUrl, url) : url;
            const isImage = item.mimeType.startsWith("image/");
            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex h-32 items-center justify-center bg-slate-100">
                  {isImage ? (
                    // Thumbnail dogfoods the Images transform pipeline (?w=300).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${url}?w=300&fmt=auto`} alt={item.alt || item.filename} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="vp-font-mono px-2 text-center text-[10px] text-slate-400">{item.mimeType}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <p className="truncate text-xs font-semibold text-slate-800" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    #{item.id} · {formatSize(item.size)}
                    {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(item.createdAt)}</p>
                  <div className="flex items-center justify-between gap-2">
                    <CopyButton text={fullUrl} />
                    <span className="vp-font-mono text-[9px] text-slate-300" title="Resize with ?w=800">
                      ?w=800
                    </span>
                  </div>

                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-800">
                      Edit details
                    </summary>
                    <form action={updateMediaAction} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <label>
                        <span className="text-[10px] font-semibold text-slate-500">Alt text</span>
                        <input name="alt" defaultValue={item.alt} className={`${INPUT} px-2 py-1 text-xs`} />
                      </label>
                      <label>
                        <span className="text-[10px] font-semibold text-slate-500">Caption</span>
                        <input name="caption" defaultValue={item.caption} className={`${INPUT} px-2 py-1 text-xs`} />
                      </label>
                      <button type="submit" className="self-start rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-700">
                        Save
                      </button>
                    </form>
                  </details>

                  <form id={`delete-media-${item.id}`} action={deleteMediaAction} className="hidden">
                    <input type="hidden" name="id" value={item.id} />
                  </form>
                  <ConfirmSubmitButton
                    formId={`delete-media-${item.id}`}
                    label="Delete file"
                    message={`Delete ${item.filename} from the library and R2?`}
                    className="mt-1 text-[11px] font-medium text-slate-400 hover:text-red-600"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminPagination page={paged} totalPages={Math.max(1, Math.ceil(total / 24))} hrefFor={(p) => `/admin/media?paged=${p}`} />
    </div>
  );
}
