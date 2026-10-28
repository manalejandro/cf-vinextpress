/**
 * Core search form used by the /search route. A plain GET form, so it
 * works with JavaScript disabled and composes with any theme.
 */
export function SearchForm({ q }: { q: string }) {
  return (
    <form method="GET" action="/search" className="flex w-full max-w-xl gap-3" role="search">
      <label htmlFor="vp-search-input" className="sr-only">
        Search
      </label>
      <input
        id="vp-search-input"
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search posts and pages…"
        className="w-full rounded-full border border-[var(--vp-line)] bg-[var(--vp-card)] px-5 py-2.5 text-sm text-[var(--vp-ink)] placeholder:text-[var(--vp-muted)] focus:border-[var(--vp-accent)] focus:outline-none"
      />
      <button type="submit" className="vp-button vp-button-solid shrink-0">
        Search
      </button>
    </form>
  );
}
