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

export const openExternalTab = () => {
  if (typeof window === "undefined") return null;

  try {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (popup) {
      try {
        popup.opener = null;
      } catch {
        return popup;
      }
    }
    return popup;
  } catch {
    return null;
  }
};

export const navigateExternalTab = (popup: Window | null, target: string) => {
  if (popup && !popup.closed) {
    try {
      popup.location.replace(target);
      popup.focus?.();
      return true;
    } catch {
      return false;
    }
  }

  return false;
};

export const openWhatsApp = (options: WhatsAppOptions | string) => {
  const target = typeof options === "string" ? options : buildWhatsAppUrl(options);
  if (typeof window === "undefined") return false;

  if (navigateExternalTab(openExternalTab(), target)) {
    return true;
  }

  try {
    const link = document.createElement("a");
    link.href = target;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
};

export const handleWhatsAppNavigation = (
  event: { preventDefault?: () => void } | undefined,
  options: WhatsAppOptions | string,
) => {
  event?.preventDefault?.();
  return openWhatsApp(options);
};