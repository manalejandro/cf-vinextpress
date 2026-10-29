"use client";

import { useEffect } from "react";

/**
 * Progressive-enhancement layer for Formsmith forms.
 *
 * The shortcode renders a plain HTML <form> that works without JavaScript
 * (POST → redirect back). When JS is available this enhancer intercepts
 * the submit, posts JSON and shows an inline status message instead.
 */
export function FormsmithEnhancer() {
  useEffect(() => {
    const handler = async (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || !form.dataset?.vpForm) return;
      event.preventDefault();

      const status = form.querySelector<HTMLElement>("[data-fs-status]");
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const payload: Record<string, string> = {};
      new FormData(form).forEach((value, key) => {
        payload[key] = String(value);
      });

      if (button) button.disabled = true;
      if (status) {
        status.textContent = "Sending…";
        status.dataset.tone = "info";
      }
      try {
        const res = await fetch("/api/v1/ext/formsmith/submit", {
          method: "POST",
          headers: { "content-type": "application/json", "x-vp-fetch": "1" },
          body: JSON.stringify({ form: form.dataset.vpForm, data: payload, ref: location.pathname }),
        });
        const json = (await res.json().catch(() => null)) as { message?: string } | null;
        if (status) {
          status.textContent = json?.message ?? (res.ok ? "Thanks! Your message was sent." : "Something went wrong.");
          status.dataset.tone = res.ok ? "ok" : "error";
        }
        if (res.ok) form.reset();
      } catch {
        if (status) {
          status.textContent = "Network error — please try again.";
          status.dataset.tone = "error";
        }
      } finally {
        if (button) button.disabled = false;
      }
    };
    document.addEventListener("submit", handler);
    return () => document.removeEventListener("submit", handler);
  }, []);
  return null;
}
