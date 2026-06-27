/**
 * Mapping pesan error Supabase Auth → Bahasa Indonesia.
 * Dipakai di Auth.tsx dan LoginDialog.tsx agar pesan konsisten.
 */
export function friendlyAuthError(message: string | undefined | null): string {
  const m = String(message || "").toLowerCase();
  if (!m) return "Terjadi kesalahan, coba lagi";
  if (m.includes("invalid login credentials")) return "Email/nomor atau kata sandi salah";
  if (m.includes("email not confirmed")) return "Akun belum aktif. Coba lagi atau hubungi support.";
  if (m.includes("user not found")) return "Akun tidak ditemukan";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Email/nomor sudah terdaftar. Silakan login.";
  if (m.includes("weak password") || m.includes("password should be") || m.includes("password is too short") || m.includes("password_too_short"))
    return "Kata sandi terlalu lemah. Minimal 8 karakter, gabungan huruf & angka.";
  if (m.includes("password") && m.includes("compromised"))
    return "Kata sandi ini bocor di pelanggaran data. Gunakan kata sandi lain.";
  if (m.includes("invalid email") || m.includes("email_address_invalid") || m.includes("unable to validate email"))
    return "Format email tidak valid.";
  if (m.includes("signup is disabled") || m.includes("signup_disabled"))
    return "Pendaftaran sedang dinonaktifkan. Hubungi admin.";
  if (m.includes("too many requests") || m.includes("rate limit") || m.includes("over_email_send_rate_limit") || m.includes("over_request_rate_limit"))
    return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Koneksi bermasalah. Periksa internet Anda dan coba lagi.";
  return message || "Terjadi kesalahan, coba lagi";
}