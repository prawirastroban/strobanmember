## Tujuan
Setelah login berhasil (Google, email, session restore, deep link native, refresh setelah update), aplikasi selalu mendarat di halaman Home (`/`) — bukan `/dashboard` dan bukan intended route yang tersimpan. Alur autentikasi itu sendiri tidak diubah, hanya tujuan navigasi terakhir.

## Perubahan

### 1. `src/components/NativeAuthBridge.tsx`
- Ganti `const next = popIntendedRoute(); navigate(next, { replace: true });` menjadi:
  - Tetap panggil `popIntendedRoute()` sekali agar sessionStorage bersih (mencegah redirect tertunda dipakai layar lain), tapi buang hasilnya.
  - `navigate("/", { replace: true })`.

### 2. `src/pages/AuthCallback.tsx`
- Di dalam `finalize()` setelah `session?.user` valid: ganti dua cabang sukses (`const next = popIntendedRoute(); navigate(next, ...)`) menjadi `popIntendedRoute(); navigate("/", { replace: true })`.
- Tidak menyentuh cabang error (`/auth?error=...`).

### 3. `src/contexts/AuthContext.tsx`
- Di `applySession`, blok yang membaca `sessionStorage.getItem("postLoginRedirect")` dan `window.history.replaceState` ke `target`: hapus/nonaktifkan agar tidak ada auto-redirect ke path lain setelah session hidrasi. Cukup bersihkan key `postLoginRedirect` bila ada, tapi jangan melakukan navigasi.
- Ini memastikan session restore saat cold start / refresh setelah update tidak melompat ke `/dashboard` atau intended route lain — router SPA tetap di route saat itu, dan flow login eksplisit selalu menuju `/` via kedua handler di atas.

### 4. `src/lib/lastRoute.ts`
- Tidak diubah. Fungsi `saveIntendedRoute` masih dipanggil `signInWithGoogle` (bagian dari flow autentikasi) — hanya konsumen di titik akhir yang mengabaikan nilainya.

## Yang tidak berubah
- `googleAuth.ts`, `platform.ts`, deep-link scheme, assetlinks.json, intent fallback, Supabase config, Android manifest.
- `ProtectedRoute` tetap membuang user tanpa session ke `/auth` (tidak terkait redirect pasca-login).
- Halaman `/dashboard` masih dapat diakses manual dari navbar/menu setelah user berada di Home.

## Verifikasi
- Login Google native → setelah `appUrlOpen`, mendarat di `/`.
- Login web (Lovable Managed OAuth) → `AuthCallback` mendarat di `/`.
- Login email/password (via `AuthContext.signIn`) → tidak ada auto-navigate di context, halaman `Auth.tsx` sudah menavigasi setelah sukses (perlu di-cek apakah menuju `/dashboard`; jika ya, akan disamakan ke `/` di build mode setelah membaca file tersebut).
- Cold start dengan session tersimpan → user tetap di route yang dibuka (mis. `/`), tidak dilempar ke `/dashboard`.
