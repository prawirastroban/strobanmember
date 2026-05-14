import { buildWhatsAppUrl, openWhatsApp } from "@/lib/whatsapp";

export interface ShareReferralOpts {
  code: string;
  link: string;
  onCopied?: (msg: string) => void;
  onError?: (msg: string) => void;
}

const buildText = (code: string, link: string) =>
  `Halo! 👋 Saya pakai Bengkel Stroban untuk servis mobil — cepat & terpercaya.\n` +
  `Daftar pakai kode referral saya: ${code}\n` +
  `Atau klik link ini: ${link}\n` +
  `Dapatkan bonus saat servis pertama 🎁`;

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

/**
 * Share referral code/link via best-available channel:
 * 1. Capacitor Share (native app)
 * 2. Web Share API (mobile browser / PWA)
 * 3. WhatsApp deeplink in external tab
 * 4. Clipboard fallback + toast
 */
export async function shareReferral({ code, link, onCopied, onError }: ShareReferralOpts) {
  const text = buildText(code, link);

  // 1. Capacitor native share
  try {
    const core: any = await import("@capacitor/core").catch(() => null);
    if (core?.Capacitor?.isNativePlatform?.()) {
      const mod: any = await import("@capacitor/share").catch(() => null);
      if (mod?.Share?.share) {
        await mod.Share.share({
          title: "Kode Referral Bengkel Stroban",
          text,
          url: link,
          dialogTitle: "Bagikan kode referral",
        });
        return;
      }
    }
  } catch (e: any) {
    if (e?.message && /cancel/i.test(e.message)) return;
  }

  // 2. Web Share API
  try {
    if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
      await (navigator as any).share({
        title: "Kode Referral Bengkel Stroban",
        text,
        url: link,
      });
      return;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return;
  }

  // 3. WhatsApp deeplink
  try {
    const url = buildWhatsAppUrl({ text });
    if (openWhatsApp(url)) return;
  } catch {}

  // 4. Clipboard fallback
  const ok = await copyToClipboard(text);
  if (ok) {
    onCopied?.("Pesan referral disalin — paste di WhatsApp untuk membagikan");
  } else {
    onError?.("Tidak bisa membagikan otomatis. Salin link manual: " + link);
  }
}