import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_ID = "G-R1H7RQCXJQ";

/**
 * Sends a GA4 `page_view` event on every SPA route change.
 * No-op until the user accepts cookies (gtag.js is loaded by CookieConsentBanner).
 * Works for every route automatically — no need to add tags per page.
 */
const GAPageviewTracker = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const gtag = (window as any).gtag;
    if (typeof gtag !== "function") return;
    if (localStorage.getItem("cookie_consent") !== "granted") return;
    // Defer one tick so document.title updated by SEOMeta is picked up
    const id = window.setTimeout(() => {
      gtag("event", "page_view", {
        send_to: GA_ID,
        page_path: pathname + search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }, 50);
    return () => window.clearTimeout(id);
  }, [pathname, search]);

  return null;
};

export default GAPageviewTracker;