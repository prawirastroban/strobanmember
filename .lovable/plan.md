## Masalah

Saat menekan "Ubah Password" dengan `test12345`, toast menampilkan pesan teknis:
> "Edge Function returned a non-2xx status code"

Penyebabnya dua lapis:

1. **Edge Function `wa-password-reset` (action `confirm`)** memanggil `supabase.auth.admin.updateUserById({ password })`. Supabase Auth memiliki proteksi **leaked password** (HaveIBeenPwned) dan **minimum strength**. Password seperti `test12345` ditolak oleh Auth, fungsi mengembalikan 500 dengan body JSON `{ error: "..." }`.
2. **Frontend** memanggil `supabase.functions.invoke(...)`. Saat status non-2xx, klien Supabase melempar `FunctionsHttpError`, **`data` jadi `null`**, dan kita hanya menampilkan `error.message` generik. Pesan JSON dari edge function tidak pernah sampai ke user.

## Yang akan diperbaiki

### 1. Edge Function `supabase/functions/wa-password-reset/index.ts`
Di blok `confirm`:
- Tambah validasi password tambahan di server (≥ 8 karakter, mengandung huruf + angka, tolak daftar umum seperti `password`, `12345678`, `qwerty`, `test1234`, `test12345`, dst.) — kirim 400 dengan pesan Bahasa Indonesia yang jelas sebelum memanggil Auth.
- Bungkus `updateUserById` dengan terjemahan error → pesan umum:
  - mengandung `weak`/`pwned`/`leaked`/`compromised` → "Password ini terlalu mudah ditebak atau pernah bocor di internet. Gunakan kombinasi huruf besar/kecil, angka, dan simbol yang unik."
  - mengandung `should be at least`/`length` → "Password terlalu pendek. Gunakan minimal 8 karakter."
  - mengandung `same as the old` → "Password baru tidak boleh sama dengan password lama."
  - fallback → "Password belum memenuhi kriteria keamanan. Coba kombinasi yang lebih kuat."
- Pastikan response 400 (bukan 500) agar UI tahu ini error validasi.

### 2. Frontend `src/pages/ResetPasswordWA.tsx`
- Buat helper kecil `extractEdgeError(error, data)` yang membaca body dari `FunctionsHttpError.context.response` (`await ctx.json()`) untuk mengambil field `error` lalu fallback ke pesan generik Bahasa Indonesia: *"Tidak dapat memperbarui password. Periksa koneksi atau coba password lain."*
- Pakai helper di `verifyOtp`, `resendOtp`, dan `submitPassword` agar semua toast menampilkan pesan ramah pengguna.
- Perketat validasi klien sebelum submit:
  - minimal 8 karakter
  - harus mengandung huruf DAN angka
  - tolak daftar pendek password umum (sama dengan server)
  - tampilkan indikator kekuatan ringan (Lemah / Sedang / Kuat) seperti di `ResetPassword.tsx`
- Saat password lemah, tampilkan inline error di bawah field, bukan hanya toast.

### 3. Konsistensi
Tidak ada perubahan DB, route, atau flow OTP. Hanya pesan error + validasi.

## File yang diubah

- `supabase/functions/wa-password-reset/index.ts` — validasi + terjemahan error
- `src/pages/ResetPasswordWA.tsx` — parser error, validasi, indikator kekuatan

## Detail teknis

```ts
// helper di frontend
async function extractEdgeError(error: any, data: any): Promise<string> {
  if (data?.error) return data.error;
  try {
    const res = error?.context?.response;
    if (res) {
      const body = await res.clone().json();
      if (body?.error) return body.error;
    }
  } catch {}
  return "Terjadi kesalahan. Silakan coba lagi.";
}
```

```ts
// di edge function
const WEAK = new Set(["password","12345678","qwerty123","test1234","test12345","admin123","11111111"]);
if (WEAK.has(newPassword.toLowerCase())) {
  return json({ error: "Password ini terlalu umum. Gunakan kombinasi yang unik." }, 400);
}
if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
  return json({ error: "Password harus mengandung huruf dan angka." }, 400);
}
```
