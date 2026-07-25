/**
 * Resolves a root-relative `public/` asset path against the deployment base
 * (`/` locally and for Tauri, `/<repo>/` on GitHub Pages).
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}
