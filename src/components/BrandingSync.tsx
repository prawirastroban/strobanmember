import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";

/**
 * Synchronizes browser tab title, favicon, and meta description
 * with the brand settings configured in /dashboard/marketing/branding.
 * Mounted globally inside <App>.
 */
const BrandingSync = () => {
  const { siteTitle, faviconUrl, siteDescription } = useBranding();

  // Update document title (browser tab text)
  useEffect(() => {
    if (siteTitle) document.title = siteTitle;
  }, [siteTitle]);

  // Update favicon
  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;

    // apple-touch-icon
    let appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleLink) {
      appleLink = document.createElement("link");
      appleLink.rel = "apple-touch-icon";
      document.head.appendChild(appleLink);
    }
    appleLink.href = faviconUrl;
  }, [faviconUrl]);

  // Update meta description
  useEffect(() => {
    if (!siteDescription) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = siteDescription;
  }, [siteDescription]);

  return null;
};

export default BrandingSync;