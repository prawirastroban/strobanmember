import { Browser } from "@capacitor/browser";
import { isNative, WEB_BASE_URL } from "@/lib/platform";

const INTERNAL_HOSTS = new Set([
  "bengkelstroban.com",
  "www.bengkelstroban.com",
  "strobanmember.lovable.app",
]);

/** True when the URL points to one of our own web origins. */
export function isInternalUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url, WEB_BASE_URL);
    return INTERNAL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Opens an external URL — uses Capacitor Browser (in-app Chrome Custom Tabs)
 * on native to keep the user inside the app shell, and a standard new-tab
 * anchor on the web.
 */
export async function openExternal(url: string): Promise<boolean> {
  if (!url) return false;

  if (isNative()) {
    try {
      await Browser.open({ url, presentationStyle: "popover" });
      return true;
    } catch (err) {
      console.warn("[openExternal] Browser.open failed", err);
      // Fall through to anchor click as last resort.
    }
  }

  if (typeof document === "undefined") return false;
  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    try {
      window.location.href = url;
      return true;
    } catch {
      return false;
    }
  }
}