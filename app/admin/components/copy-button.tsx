"use client";

import { useState } from "react";

/** Copy-to-clipboard button for media URLs. */
export function CopyButton({ text, label = "Copy URL" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="text-xs font-medium text-orange-600 hover:text-orange-500"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
