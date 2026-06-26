## Masalah

Pada Android (Capacitor edge-to-edge), toast "Belum ada pesanan aktif" muncul **menempel di status bar**, menutupi area sistem (jam, sinyal, baterai) dan navbar aplikasi.

Akar masalah: `src/components/ui/sonner.tsx` menghitung offset top via **JS probe** (`getBoundingClientRect().top` pada elemen `position:fixed; top:env(safe-area-inset-top)`). Pada banyak WebView Android, probe ini dieksekusi sebelum `viewport-fit=cover` selesai meng-expose nilai safe-area, sehingga balik `0`. Hasilnya `offset = 0 + 56 + 8 = 64px` — jauh lebih kecil daripada (status bar 24–48px + navbar 56px), jadi toast naik ke area status bar.

## Perbaikan

### 1. `src/components/ui/sonner.tsx` — buang JS probe, pakai CSS murni
- Hapus `useEffect` yang memprobe `getBoundingClientRect`.
- Set offset Sonner langsung lewat **CSS variable** `--toast-top-offset: calc(env(safe-area-inset-top, 0px) + 3.5rem + 0.5rem)` di container, dan teruskan ke prop `offset={"var(--toast-top-offset)"}` (Sonner menerima string CSS).
- `--width` mobile cukup pakai media query CSS, atau tetap pakai `matchMedia` untuk lebar saja (tidak terkait posisi).
- Hasil: nilai selalu reaktif terhadap safe-area Android (24/48/82px untuk notch/punch-hole), tanpa race condition.

### 2. `src/components/ui/toast.tsx` — naikkan z-index & verifikasi
- Sudah pakai `top: calc(env(safe-area-inset-top) + 3.5rem + 0.5rem)` ✓.
- Tingkatkan `z-[100]` → `z-[60]` agar di bawah toast Sonner tapi tetap konsisten (atau biarkan, sudah aman). Tambahkan fallback `env(safe-area-inset-top, 0px)` untuk Android lama yang belum tahu `env()`.

### 3. `src/components/CookieConsentBanner.tsx` & `BottomNav.tsx` — audit cepat
- Pastikan tidak ada elemen `fixed top-0` lain yang lupa pakai `env(safe-area-inset-top)`.
- Konfirmasi `NotificationBell` badge (di dalam navbar) tidak bermasalah — navbar sendiri sudah respect safe-area via `calc(3.5rem + env(safe-area-inset-top))`.

### 4. Verifikasi
- Build & jalankan Playwright headless dengan viewport mobile + emulasi `env(safe-area-inset-top: 48px)` via CSS injection, trigger toast, screenshot.
- Konfirmasi visual: toast berada di bawah navbar, tidak menyentuh status bar, dan tetap responsif saat orientasi/keyboard berubah.

## Catatan teknis
Sonner v1.x menerima `offset` sebagai `string | number`. Memberi string CSS valid (`"calc(env(safe-area-inset-top, 0px) + 64px)"`) langsung dipakai sebagai value `top`, sehingga browser yang me-resolve `env()` (semua WebView Android modern + iOS) otomatis mendapat offset yang benar. Untuk Android sangat lama (< Android 8 WebView) fallback `0px` membuat toast tampil di posisi navbar — masih aman karena navbar sendiri tidak punya safe-area di device tersebut.
