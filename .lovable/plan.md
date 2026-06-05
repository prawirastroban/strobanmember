# Plan: Tombol "Install App" di Sidebar

## Tujuan
Menambahkan tombol **"Install App"** di `DesktopSidebar.tsx` (menu hamburger utama) yang:
- Memicu install prompt native di Android/Chrome/Edge (via `beforeinstallprompt`)
- Menampilkan panduan visual untuk iOS Safari (tidak punya prompt native)
- Otomatis tersembunyi jika app sudah ter-install (display-mode: standalone)
- Tersembunyi di environment Capacitor native (sudah jadi APK)

## Lokasi UI
Di `src/components/DesktopSidebar.tsx`, tambah **section baru "Aplikasi"** antara section **"Preferensi"** dan **"Bantuan"**:

```text
┌─────────────────────────┐
│ Preferensi              │
│  - Mode Gelap           │
│  - Bahasa               │
├─────────────────────────┤
│ Aplikasi          ← NEW │
│  📱 Install App         │
├─────────────────────────┤
│ Bantuan                 │
│  - Kirim Feedback       │
└─────────────────────────┘
```

Tombol pakai style `itemBtnClass` yang sudah ada (konsisten dengan item lain), icon `Download` atau `Smartphone` dari lucide-react.

## Behavior

### State deteksi
Buat hook ringan `useInstallPrompt()` di `src/hooks/useInstallPrompt.ts`:
- Listen `beforeinstallprompt` → simpan event, set `canInstall = true`
- Detect iOS Safari → set `isIOS = true` (perlu manual guide)
- Detect `display-mode: standalone` atau `navigator.standalone` → `isInstalled = true` (sembunyikan tombol)
- Detect Capacitor (`window.Capacitor?.isNativePlatform()`) → `isNative = true` (sembunyikan tombol)

### Klik tombol
- **Android/Desktop dengan prompt tersedia:** panggil `deferredPrompt.prompt()`, toast hasilnya
- **iOS / browser tanpa prompt:** buka `<Dialog>` panduan visual dengan langkah:
  - iOS: Share icon → Add to Home Screen
  - Android Chrome: Menu 3 titik → Install app
  - Desktop Chrome: Icon install di address bar
  Dialog pakai komponen `Dialog` yang sudah di-import (sama seperti Feedback dialog).

### Visibility
- Hide tombol jika: `isInstalled || isNative`
- Selalu tampil di browser web non-installed (Android, iOS, Desktop) — meski iOS-nya cuma guide

## Files yang Berubah

1. **`src/hooks/useInstallPrompt.ts`** *(baru)* — hook deteksi + simpan deferred event
2. **`src/components/DesktopSidebar.tsx`** *(edit)* — tambah section "Aplikasi", tombol, dialog panduan iOS/Android

## Yang TIDAK Diubah
- Tidak edit Service Worker, manifest, atau routing
- Tidak edit `Navbar.tsx`, `MobileNav.tsx`, `BottomNav.tsx` (scope khusus sidebar utama sesuai permintaan)
- Tidak ubah booking/payment/auth

## Risiko
- **Sangat rendah.** Murni UI tambahan, fitur opsional, gagal-aman (kalau prompt tidak tersedia, fallback ke dialog panduan)
- Tidak menyentuh sistem live (booking/payment/CRM)

## Estimasi
~15 menit implementasi, 1 file baru + 1 edit.

---
Setujui untuk implementasi?
