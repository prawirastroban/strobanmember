/**
 * Appends a cache-busting version marker to a storage image URL so replaced
 * photos (same file name) are not served from the Android WebView cache.
 */
export function withAssetVersion(url: string | null | undefined, stamp?: string | null): string {
  if (!url) return url ?? "";
  if (!stamp) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const v = String(Date.parse(stamp) || stamp);
  if (url.includes("v=")) return url;
  return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(v);
}