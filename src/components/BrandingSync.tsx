import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useBranding } from "@/hooks/useBranding";

const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

/**
 * Synchronizes browser tab title, favicon, and meta description
 * with the brand settings configured in /dashboard/marketing/branding.
 * Mounted globally inside <App>.
 */
const BrandingSync = () => {
  const { siteTitle, faviconUrl, siteDescription, brandName } = useBranding();
  const location = useLocation();

  // Update document title (browser tab text). Re-apply on every route change so
  // pages that temporarily override document.title don't permanently mask the
  // brand title.
  useEffect(() => {
    if (siteTitle) document.title = siteTitle;
  }, [siteTitle, location.pathname]);

  // Update Open Graph / Twitter / Apple meta tags
  useEffect(() => {
    if (siteTitle) {
      upsertMeta('meta[property="og:title"]', "property", "og:title", siteTitle);
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", siteTitle);
    }
    if (brandName) {
      upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", brandName);
      upsertMeta('meta[name="apple-mobile-web-app-title"]', "name", "apple-mobile-web-app-title", brandName);
    }
  }, [siteTitle, brandName]);

  // Update favicon
  useEffect(() => {
    if (!faviconUrl) return;
    // Remove ALL existing icon links to avoid duplicates / stale static refs
    document
      .querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      .forEach((n) => n.parentNode?.removeChild(n));
    const bust = faviconUrl + (faviconUrl.includes("?") ? "&" : "?") + "v=" + Date.now();
    (["icon", "shortcut icon", "apple-touch-icon"] as const).forEach((rel) => {
      const link = document.createElement("link");
      link.rel = rel;
      link.href = bust;
      document.head.appendChild(link);
    });
    try {
      localStorage.setItem("app_favicon_url", faviconUrl);
    } catch {}
  }, [faviconUrl]);

  // Update meta description
  useEffect(() => {
    if (!siteDescription) return;
    upsertMeta('meta[name="description"]', "name", "description", siteDescription);
    upsertMeta('meta[property="og:description"]', "property", "og:description", siteDescription);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", siteDescription);
  }, [siteDescription]);

  return null;
};

export default BrandingSync;