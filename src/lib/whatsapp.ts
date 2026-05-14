export interface WhatsAppOptions {
  phone?: string | null;
  text?: string;
}

export const normalizeWhatsAppPhone = (phone?: string | null) => {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("0") ? `62${cleaned.slice(1)}` : cleaned;
};

export const buildWhatsAppUrl = ({ phone, text }: WhatsAppOptions = {}) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const params = new URLSearchParams();

  if (text) params.set("text", text);

  const query = params.toString();
  if (normalizedPhone) {
    return `https://wa.me/${normalizedPhone}${query ? `?${query}` : ""}`;
  }

  return `https://wa.me/${query ? `?${query}` : ""}`;
};

// Backwards-compat no-ops kept for any older callers.
export const openExternalTab = () => null;
export const navigateExternalTab = (_popup: unknown, _target: string) => false;

export const openWhatsApp = (options: WhatsAppOptions | string) => {
  const target = typeof options === "string" ? options : buildWhatsAppUrl(options);
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const link = document.createElement("a");
    link.href = target;
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
      window.location.href = target;
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * For <a href={waUrl} target="_blank" onClick={(e) => handleWhatsAppNavigation(e, waUrl)}>.
 * If the click is a real anchor click (left-click, no modifier), let the browser
 * handle the top-level navigation natively — that's what reliably escapes the
 * Lovable preview iframe. Only fall back to programmatic open for non-anchor
 * callers (buttons) where no native navigation will happen.
 */
export const handleWhatsAppNavigation = (
  event: any,
  options: WhatsAppOptions | string,
) => {
  const isAnchorClick =
    event &&
    event.currentTarget &&
    typeof event.currentTarget.tagName === "string" &&
    event.currentTarget.tagName.toUpperCase() === "A" &&
    event.currentTarget.href &&
    !event.defaultPrevented &&
    (event.button === undefined || event.button === 0) &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

  if (isAnchorClick) {
    // Let the native anchor navigation proceed — most reliable in iframe.
    return true;
  }

  event?.preventDefault?.();
  return openWhatsApp(options);
};