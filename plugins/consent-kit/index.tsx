import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { getOption } from "../../press/options";
import { ConsentBanner } from "./banner";
import { saveConsentSettingsAction } from "./actions";

/**
 * Consent Kit — GDPR/ePrivacy cookie notice.
 *
 * Renders a dismissible banner (top or bottom), remembers the decision in
 * localStorage for a configurable period, and exposes it to other scripts
 * via the `vp:consent` window event. The platform itself sets no tracking
 * cookies, so this is about transparency and future third-party embeds.
 */

const DEFAULT_MESSAGE =
  "We use local storage to remember your preferences (theme, consent) and keep this site fast. No advertising cookies, no third-party trackers.";

export const consentKit: PluginDefinition = {
  manifest: {
    slug: "consent-kit",
    name: "Consent Kit",
    description:
      "Cookie/privacy consent banner with localStorage persistence, configurable copy, position and expiry. Emits a vp:consent event for embeds.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.addFilter<unknown[]>(CoreHooks.DocumentFooter, async (nodes) => {
      const [message, position, expiryRaw, moreUrl, acceptLabel, declineLabel] = await Promise.all([
        getOption("consent_message", DEFAULT_MESSAGE),
        getOption("consent_position", "bottom"),
        getOption("consent_expiry_days", "180"),
        getOption("consent_more_url", ""),
        getOption("consent_accept_label", "Accept"),
        getOption("consent_decline_label", "Decline"),
      ]);
      return [
        ...nodes,
        <ConsentBanner
          key="consent-banner"
          message={message || DEFAULT_MESSAGE}
          acceptLabel={acceptLabel || "Accept"}
          declineLabel={declineLabel || "Decline"}
          position={position === "top" ? "top" : "bottom"}
          expiryDays={Number(expiryRaw) || 180}
          moreUrl={moreUrl || undefined}
        />,
      ];
    });

    api.registerAdminPage({
      title: "Consent Kit",
      description: "Banner settings",
      capability: "administrator",
      async render({ searchParams }) {
        const [message, position, expiry, moreUrl, acceptLabel, declineLabel] = await Promise.all([
          getOption("consent_message", DEFAULT_MESSAGE),
          getOption("consent_position", "bottom"),
          getOption("consent_expiry_days", "180"),
          getOption("consent_more_url", ""),
          getOption("consent_accept_label", "Accept"),
          getOption("consent_decline_label", "Decline"),
        ]);
        return (
          <div className="flex max-w-2xl flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consent Kit</h1>
              <p className="mt-1 text-sm text-slate-500">
                The banner shows until the visitor decides; the decision is stored locally in their browser for
                the expiry period below.
              </p>
            </div>

            {searchParams.saved ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                Consent settings saved.
              </div>
            ) : null}

            <form action={saveConsentSettingsAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Message</span>
                <textarea
                  name="message"
                  rows={3}
                  maxLength={400}
                  defaultValue={message}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-500"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Position</span>
                  <select name="position" defaultValue={position} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Expiry (days)</span>
                  <input name="expiry_days" type="number" min={1} max={365} defaultValue={expiry} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">“Learn more” URL</span>
                  <input name="more_url" type="url" placeholder="https://…/privacy" defaultValue={moreUrl} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Accept label</span>
                  <input name="accept_label" defaultValue={acceptLabel} maxLength={40} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Decline label</span>
                  <input name="decline_label" defaultValue={declineLabel} maxLength={40} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
                </label>
              </div>
              <button type="submit" className="self-start rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700">
                Save consent settings
              </button>
            </form>
          </div>
        );
      },
    });
  },
};
