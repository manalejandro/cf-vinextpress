/**
 * Generates the inline SVG "screenshot" previews shown in the dashboard's
 * Appearance screen — no binary assets, no external requests, fully typed.
 */

export interface ScreenshotOptions {
  name: string;
  tagline: string;
  bg: string;
  card: string;
  ink: string;
  muted: string;
  accent: string;
  serif?: boolean;
}

export function svgScreenshot(opts: ScreenshotOptions): string {
  const font = opts.serif ? "Georgia, serif" : "system-ui, sans-serif";
  const line = (x: number, y: number, w: number, h: number, color: string, r = 4) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
  <rect width="600" height="450" fill="${opts.bg}"/>
  <rect x="0" y="0" width="600" height="64" fill="${opts.card}"/>
  <text x="32" y="40" font-family="${font}" font-size="22" font-weight="bold" fill="${opts.ink}">${opts.name}</text>
  ${line(420, 28, 60, 8, opts.muted, 4)}
  ${line(496, 28, 72, 8, opts.muted, 4)}
  ${line(0, 64, 600, 3, opts.accent, 0)}
  <text x="32" y="120" font-family="${font}" font-size="13" fill="${opts.muted}">${opts.tagline}</text>
  ${line(32, 148, 380, 22, opts.ink, 4)}
  ${line(32, 184, 300, 10, opts.muted, 5)}
  ${line(32, 214, 536, 10, opts.muted, 5)}
  ${line(32, 234, 500, 10, opts.muted, 5)}
  ${line(32, 254, 520, 10, opts.muted, 5)}
  ${line(32, 292, 90, 26, opts.accent, 13)}
  <rect x="32" y="344" width="256" height="74" rx="8" fill="${opts.card}" stroke="${opts.muted}" stroke-opacity="0.25"/>
  <rect x="312" y="344" width="256" height="74" rx="8" fill="${opts.card}" stroke="${opts.muted}" stroke-opacity="0.25"/>
  ${line(48, 362, 160, 10, opts.ink, 5)}
  ${line(48, 384, 220, 8, opts.muted, 4)}
  ${line(328, 362, 140, 10, opts.ink, 5)}
  ${line(328, 384, 200, 8, opts.muted, 4)}
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
