/**
 * Identitas akun berbasis nomor HP.
 *
 * Supabase Auth memvalidasi TLD email — domain `.local` (RFC 6762, reserved)
 * ditolak dengan "Unable to validate email address: invalid format". Karena itu
 * akun WA/HP memakai domain placeholder `phone.bengkelstroban.com` yang valid
 * secara format (dan tidak benar-benar menerima email).
 *
 * Helper di file ini dipakai di seluruh flow: signup, login, reset, dan
 * pembuatan customer dari dashboard, sehingga formatnya konsisten 100%.
 */

export const PHONE_EMAIL_DOMAIN = "phone.bengkelstroban.com";
const LEGACY_DOMAIN = "phone.local";

/** Normalisasi raw input nomor → digit-only diawali "62" (tanpa "+"). */
export function normalizePhoneDigits(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.replace(/^0+/, "");
  return "62" + digits;
}

/** Format E.164 lengkap dengan tanda "+". */
export function toE164(raw: string): string {
  const d = normalizePhoneDigits(raw);
  return d ? `+${d}` : "";
}

/** Mengubah nomor HP → synthetic email yang valid di mata Supabase Auth. */
export function phoneToEmail(raw: string): string {
  const d = normalizePhoneDigits(raw);
  if (!d) return "";
  return `${d}@${PHONE_EMAIL_DOMAIN}`;
}

/** True bila email adalah synthetic email akun nomor HP (baru atau lama). */
export function isPhoneEmail(email: string | null | undefined): boolean {
  const e = String(email || "").toLowerCase();
  return e.endsWith(`@${PHONE_EMAIL_DOMAIN}`) || e.endsWith(`@${LEGACY_DOMAIN}`);
}

/** Ekstrak digit nomor HP dari synthetic email; "" jika bukan synthetic email. */
export function emailToPhoneDigits(email: string | null | undefined): string {
  const e = String(email || "").toLowerCase();
  if (!isPhoneEmail(e)) return "";
  return e.split("@")[0] || "";
}