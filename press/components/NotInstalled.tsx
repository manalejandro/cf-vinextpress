/**
 * Shown on the frontend while the site has not been installed yet.
 * Points to the setup wizard in the dashboard.
 */
export function NotInstalled() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--vp-accent)] text-2xl font-bold text-white"
      >
        V
      </div>
      <h1 className="vp-font-head text-3xl font-bold">VinextPress is ready to be installed</h1>
      <p className="max-w-md leading-7 text-[var(--vp-muted)]">
        This site has not been set up yet. Run the one-minute installer to create your administrator account,
        choose a title and publish your first entry.
      </p>
      <a href="/admin" className="vp-button vp-button-solid">
        Open the installer →
      </a>
    </main>
  );
}
