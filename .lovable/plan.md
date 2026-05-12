# Pastikan Share Kode Referral via WhatsApp Selalu Berhasil

## Masalah
Saat ini `src/pages/Referral.tsx` hanya membuka `https://wa.me/?text=...` lewat `window.open`. Ini kadang gagal di:
- App native Capacitor (popup blocker / tidak ada handler `wa.me`)
- iOS Safari saat WhatsApp tidak terpasang (jadi halaman kosong)
- Desktop tanpa WhatsApp Desktop (user bingung)
- Tidak ada fallback "copy link" jika share batal

## Solusi
Buat util `shareReferral()` dengan strategi berlapis, dipakai oleh tombol di halaman Referral.

### Urutan fallback
1. **Capacitor Share plugin** (jika berjalan di native app) — buka native share-sheet, user pilih WhatsApp/Telegram/Copy.
2. **Web Share API** (`navigator.share`) — di mobile browser & PWA modern, buka share-sheet OS.
3. **WhatsApp deeplink** `https://wa.me/?text=...` di tab baru — desktop & fallback umum.
4. **Copy ke clipboard + toast** — kalau semua gagal/diblokir, tetap user dapat link.

### Pesan share (rapi & lengkap)
```
Halo! 👋 Saya pakai Bengkel Stroban untuk servis mobil — cepat & terpercaya.
Daftar pakai kode referral saya: <CODE>
Atau klik link ini: <LINK>
Dapatkan bonus saat servis pertama 🎁
```

### Detail teknis
- File baru: `src/lib/shareReferral.ts` — fungsi `shareReferral({ code, link, toast })`.
- Update `src/pages/Referral.tsx`:
  - Ganti `shareWA` → panggil util.
  - Tambah tombol kedua "Salin Link" sudah ada (icon Copy) — tidak diubah.
  - Tampilkan toast sukses/fallback.
- Install `@capacitor/share` (sudah ada Capacitor di project) lewat dynamic import agar tidak error di web build:
  ```ts
  const { Share } = await import("@capacitor/share").catch(() => ({ Share: null }));
  ```
- Deteksi native: `Capacitor.isNativePlatform()` (dynamic import `@capacitor/core`).
- Encode `text` dengan `encodeURIComponent`.
- Untuk wa.me, tambahkan `noopener,noreferrer` dan periksa hasil `window.open`; kalau `null` → fallback copy.

### QA cepat
- Desktop Chrome → buka tab `web.whatsapp.com` siap kirim.
- Mobile Safari/Chrome → muncul share-sheet (via Web Share API).
- App Capacitor → muncul native share-sheet.
- Popup diblokir → toast "Link disalin, paste di WhatsApp".

## Out of scope
- Tidak menambah Twilio/WhatsApp Business API server (tidak diminta).
- Tidak mengubah tombol WA support lain (Hero, BranchLocations, dll).
