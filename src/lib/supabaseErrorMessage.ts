// Ubah error teknis dari backend menjadi kalimat Bahasa Indonesia yang ramah.
export function friendlyDbError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");
  const msg = raw.toLowerCase();

  if (!raw) return "Terjadi gangguan. Coba lagi sebentar.";
  if (msg.includes("schema cache") || msg.includes("does not exist"))
    return "Server sedang sibuk atau baru aktif kembali. Coba lagi sebentar.";
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network"))
    return "Koneksi internet terputus. Periksa jaringan Anda lalu coba lagi.";
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "Server lambat merespons. Coba lagi sebentar.";
  if (msg.includes("jwt") || msg.includes("not authenticated") || msg.includes("unauthorized"))
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  if (msg.includes("row-level security") || msg.includes("permission denied"))
    return "Anda tidak punya akses untuk perubahan ini.";
  return "Gagal menyimpan. Coba lagi sebentar.";
}
