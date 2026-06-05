## Masalah

Statistik di `/dashboard/pwa-settings` menghitung event dari tabel `pwa_events`. Saat ini event hanya dicatat dari banner install (`shown`, `accepted`, `dismissed`):

- iOS Safari **tidak pernah** menembak event `appinstalled` dan tidak punya prompt native — pengguna iPhone meng-install lewat menu Share manual, jadi event `accepted` **tidak pernah masuk**, baris **Install** selalu 0.
- Android/Desktop pun hanya menambah `accepted` lewat tombol di banner; jika user menerima prompt sistem di luar banner (mis. lewat menu Chrome), juga tidak tercatat.

## Rencana Perbaikan

### 1. Tambah pencatatan install yang andal (frontend saja)

Buat hook kecil `useInstallTracker` (atau letakkan di `App.tsx`) yang dijalankan sekali per perangkat:

- Saat app dimuat, deteksi mode standalone:
  - `window.matchMedia('(display-mode: standalone)').matches`
  - atau `navigator.standalone === true` (iOS)
  - atau berjalan di dalam Capacitor (`window.Capacitor?.isNativePlatform()`)
- Jika standalone DAN flag `localStorage["pwa_install_logged"]` belum ada:
  - Tentukan platform via UA (`ios` / `android` / `desktop`).
  - Insert satu baris ke `pwa_events` dengan `event = "accepted"`, `platform = <platform>`.
  - Set flag `localStorage["pwa_install_logged"] = "1"` agar tidak dobel di kunjungan berikutnya.
- Tambahkan juga listener global `window.addEventListener("appinstalled", ...)` di luar banner (Android/Desktop) yang melakukan hal yang sama jika flag belum diset.

### 2. Mount global

Mount hook di `App.tsx` (sekali, di luar `InstallAppBanner`) agar tetap mencatat meski banner sudah didismiss atau halaman dibuka langsung dalam mode standalone.

### 3. Tidak ubah skema database

Tabel `pwa_events` sudah punya kolom `event`, `platform`, `created_at`. RLS sudah mengizinkan public insert. Tidak ada migrasi.

## Hasil

- Begitu user iPhone Anda membuka app dari icon home screen sekali saja, satu event `accepted` (iOS) akan tercatat → angka **Install iOS** di kartu Statistik 30 Hari akan naik dari 0.
- Conversion rate iOS jadi akurat.
- Tidak ada duplikat karena dilindungi flag localStorage per perangkat.