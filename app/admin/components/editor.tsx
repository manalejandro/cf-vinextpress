"use client";

import { useId, useRef, useState } from "react";
import { marked } from "marked";

/**
 * Client-side editor pieces:
 * - ContentEditor: Markdown/HTML textarea with a live preview tab.
 * - TitleSlugFields: title input that auto-suggests the slug until edited.
 */

export function ContentEditor({
  name,
  initialValue,
  rows = 22,
}: {
  name: string;
  initialValue: string;
  rows?: number;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function showPreview() {
    const source = textareaRef.current?.value ?? "";
    setPreview(await marked.parse(source, { async: true }));
    setTab("preview");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            tab === "write" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={showPreview}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            tab === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Preview
        </button>
        <span className="ml-auto pr-2 text-[11px] text-slate-400">Markdown supported</span>
      </div>

      <div className={tab === "write" ? "block" : "hidden"}>
        <textarea
          ref={textareaRef}
          name={name}
          rows={rows}
          defaultValue={initialValue}
          spellCheck
          className="vp-font-mono w-full resize-y bg-white px-4 py-3.5 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
          placeholder={"Write your story in Markdown…\n\n## A heading\n\nA paragraph with **emphasis** and a [link](https://example.com)."}
        />
      </div>

      {tab === "preview" ? (
        <div
          className="vp-content min-h-64 max-h-[36rem] overflow-y-auto bg-white px-6 py-5"
          // Preview of trusted author content, rendered client-side with marked.
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      ) : null}
    </div>
  );
}

function slugifyBrowser(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

export function TitleSlugFields({
  title,
  slug,
  permalinkHint,
}: {
  title: string;
  slug: string;
  permalinkHint: string;
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(slug));
  const titleId = useId();
  const slugId = useId();

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={titleId} className="sr-only">
        Title
      </label>
      <input
        id={titleId}
        name="title"
        defaultValue={title}
        required
        placeholder="Add title"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xl font-semibold text-slate-900 shadow-sm outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        onInput={(event) => {
          if (slugTouched) return;
          const slugInput = document.getElementById(slugId) as HTMLInputElement | null;
          if (slugInput) slugInput.value = slugifyBrowser(event.currentTarget.value);
        }}
      />
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="vp-font-mono shrink-0 text-xs text-slate-400">{permalinkHint}</span>
        <label htmlFor={slugId} className="sr-only">
          Slug
        </label>
        <input
          id={slugId}
          name="slug"
          defaultValue={slug}
          placeholder="auto-generated-slug"
          onChange={() => setSlugTouched(true)}
          className="vp-font-mono w-72 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm outline-none focus:border-orange-500"
        />
      </div>
    </div>
  );
}
