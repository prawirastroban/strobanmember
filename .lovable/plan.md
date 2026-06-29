## Diagnosis

Yang muncul di log Anda sebenarnya **dua hal terpisah**, dan kabar baiknya: kode di repo sudah benar.

1. **Penyebab build gagal** — bukan error kode, tapi `fatal error: runtime: cannot allocate memory` dari proses Go (esbuild). Artinya **Node/esbuild kehabisan RAM** saat membundel chunk besar di laptop Anda. Ini selalu terjadi di tahap "rendering chunks (24)" yang sama → klasik OOM, bukan bug.
2. **Warning CSS** (`Unexpected "button"`) — selector di `src/index.css` baris 1168–1196 menulis `button.bg-primary`, `button.bg-secondary`, `button.border-input`. Karena `bg-primary`/`bg-secondary` juga punya varian `data-[state=checked]:bg-primary` dari Radix, esbuild's CSS minifier menggabungkannya jadi selector aneh `...[data-state="checked"]button`. Hanya warning, tidak menghentikan build — tapi sebaiknya dirapikan.

## Yang akan dilakukan (setelah Anda approve)

### A. Perbaikan kode (1 file)
**`src/index.css`** — ganti tiga selector bermasalah supaya `button` muncul sebagai konteks, bukan ditempel di ujung kelas:
- `button.bg-primary` → `button.bg-primary:not([data-state])` (atau pindahkan rule keluar dari `@layer components` dan pakai `:where(button).bg-primary` agar minifier tidak mencampurnya dengan varian Radix)
- Sama untuk `button.bg-secondary` dan `button.border-input`
- Hasil: warning hilang, tampilan tombol tidak berubah.

### B. Instruksi build lokal (untuk Anda jalankan)

OOM-nya karena memori Node default di Windows terlalu kecil untuk bundle proyek ini. Jalankan build dengan heap yang dinaikkan:

PowerShell (one-off):
```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

Atau permanen — tambahkan script di `package.json`:
```json
"build:win": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vite build"
```
(perlu `npm i -D cross-env`)

Tips tambahan kalau masih OOM:
- Tutup Chrome/Android Studio/emulator saat build (mereka makan 2–4 GB).
- Pastikan `node_modules` di-scan-kan ke whitelist Windows Defender (scan real-time bisa menggandakan pemakaian memori esbuild).
- Cek `node -v` — gunakan Node 20 LTS (Node 18 lebih boros di Windows untuk Vite 5).

## Yang TIDAK akan diubah

- `src/lib/googleAuth.ts`, `AuthCallback.tsx`, `NativeAuthBridge.tsx`, `capacitor.config.ts`, `package.json` — semua sudah benar, tidak ada lagi referensi `@codetrix-studio/capacitor-google-auth`.
- Tidak menyentuh konfigurasi Vite/Capacitor lain.

## Verifikasi

- `npm run build` selesai tanpa warning CSS `Unexpected "button"`.
- Setelah Anda menaikkan `--max-old-space-size`, build selesai sampai akhir tanpa `cannot allocate memory`.
