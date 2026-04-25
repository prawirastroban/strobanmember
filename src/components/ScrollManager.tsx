import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Global scroll & viewport manager:
 *  - Scrolls to top on route change (instant for new nav, restores for POP/back).
 *  - Honors `#hash` by scrolling the target into view with header offset.
 *  - Disables the browser's default scroll restoration (we handle it).
 *  - Maintains a `--vh` CSS var equal to `1%` of the visible viewport so
 *    `min-h-[calc(var(--vh)*100)]` avoids the iOS 100vh address-bar bug.
 *  - When an input/textarea is focused on mobile, scrolls it into view
 *    above the on-screen keyboard.
 */
const HEADER_OFFSET = 72; // safe offset for any sticky header

const ScrollManager = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const positions = useRef<Map<string, number>>(new Map());
  const prevKey = useRef<string>(location.key);

  // Disable browser scroll restoration once.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      try { window.history.scrollRestoration = "manual"; } catch {/* ignore */}
    }
  }, []);

  // Maintain --vh for dynamic viewport height (mobile address-bar safe).
  useEffect(() => {
    const setVh = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("resize", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("resize", setVh);
    };
  }, []);

  // Scroll to input on focus (avoid keyboard overlap).
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      // Wait for keyboard to appear, then center the field.
      window.setTimeout(() => {
        try { t.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {/* ignore */}
      }, 280);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  // Track scroll position for the leaving route so POP can restore it.
  useEffect(() => {
    const save = () => positions.current.set(prevKey.current, window.scrollY);
    const onScroll = () => save();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Handle navigation: hash > restore > top.
  useEffect(() => {
    const key = location.key;
    const hash = location.hash;

    const doScroll = () => {
      if (hash) {
        const el = document.querySelector(hash);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          prevKey.current = key;
          return;
        }
      }
      if (navType === "POP") {
        const y = positions.current.get(key) ?? 0;
        window.scrollTo({ top: y, behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      prevKey.current = key;
    };

    // Defer one frame so the new page has rendered (heights are correct).
    const r = requestAnimationFrame(doScroll);
    return () => cancelAnimationFrame(r);
  }, [location.key, location.hash, location.pathname, navType]);

  return null;
};

export default ScrollManager;