"use client";

import { useEffect, useState } from "react";

/**
 * Cookie-consent banner. Stores the decision in localStorage (no cookies
 * are set by the platform itself), expires after the configured number of
 * days, and broadcasts a `vp:consent` window event so other scripts can
 * react to the decision.
 */

const STORAGE_KEY = "vp-consent";

export interface ConsentBannerProps {
  message: string;
  acceptLabel: string;
  declineLabel: string;
  position: "bottom" | "top";
  expiryDays: number;
  moreUrl?: string;
}

interface StoredConsent {
  v: number;
  decision: "accepted" | "declined";
  ts: number;
}

export function ConsentBanner({ message, acceptLabel, declineLabel, position, expiryDays, moreUrl }: ConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredConsent;
        const fresh = stored?.v === 1 && Date.now() - stored.ts < expiryDays * 86_400_000;
        if (fresh) return;
      }
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [expiryDays]);

  function decide(decision: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, decision, ts: Date.now() }));
      window.dispatchEvent(new CustomEvent("vp:consent", { detail: { decision } }));
    } catch {
      /* storage unavailable */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className={`fixed inset-x-0 z-50 flex justify-center px-4 ${position === "top" ? "top-4" : "bottom-4"}`}
    >
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-6 text-slate-700">
          {message}{" "}
          {moreUrl ? (
            <a href={moreUrl} className="font-medium text-slate-900 underline underline-offset-2">
              Learn more
            </a>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {declineLabel}
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
