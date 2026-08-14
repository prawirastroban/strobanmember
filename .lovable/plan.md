# Sinkronisasi Konten Otomatis ke Aplikasi Android

## Jawaban singkat

Aplikasi Android saat ini membungkus web app secara lokal (`webDir: dist`, tanpa `server.url`), tapi **semua data diambil langsung dari backend**. Artinya:

- Konten dinamis (banner, katalog/layanan, harga, foto, promo, deskripsi) **memang sudah ikut berubah** — tetapi umumnya baru terlihat saat halaman dibuka ulang atau aplikasi di-restart, karena sebagian besar layar hanya mengambil data sekali saat mount (mis. `useHomeBanners` hanya refetch saat window fokus).
- Perubahan tampilan/kode aplikasi (bukan data) tetap butuh build APK baru — di luar cakupan ini.

Tujuan plan ini: konten dinamis berubah **seketika** di HP tanpa perlu tutup-buka aplikasi, plus banner kecil "Konten diperbarui".

## Yang akan dibangun

### 1. Realtime untuk tabel konten
Aktifkan Realtime pada tabel konten publik: `home_banners`, `services`, `service_categories`, `service_icons`, `promos`, `tires`, `app_settings`, `app_branding`.

### 2. Content Sync Provider
Satu provider global yang:
- Membuka satu channel realtime untuk seluruh tabel konten di atas (hemat koneksi).
- Menyiarkan sinyal "konten X berubah" ke hook-hook terkait sehingga data langsung dimuat ulang.
- Menggabungkan perubahan beruntun (debounce ~800ms) agar tidak refetch berkali-kali saat staff menyimpan banyak item.

### 3. Refetch otomatis di hook konten
Hook konten (banner, kategori & layanan katalog, promo, ban, branding) mendengarkan sinyal tersebut dan memuat ulang datanya. Ditambah pemulihan koneksi: refetch saat aplikasi kembali dari background/online (penting di Android saat app di-resume).

### 4. Banner "Konten diperbarui"
Toast/banner kecil bergaya iOS di bagian bawah, muncul beberapa detik setelah konten baru masuk, dengan teks seperti "Konten diperbarui". Tidak menutup tombol, tidak butuh aksi pengguna — data sudah diperbarui otomatis.

### 5. Gambar selalu segar
URL gambar dari storage diberi penanda versi (berbasis `updated_at`) agar foto yang diganti dengan nama file sama tidak tertahan cache WebView Android.

## Catatan teknis

- Migrasi: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` untuk tabel di atas; RLS publik yang ada tetap berlaku sehingga hanya baris yang boleh dibaca yang dikirim.
- Provider baru `src/contexts/ContentSyncContext.tsx` + util `src/lib/contentSyncBus.ts`; dipasang di `App.tsx` (satu channel, cleanup di unmount agar tidak ada langganan bocor).
- Hook yang disesuaikan: `useHomeBanners`, `useServiceCategories`, `useBranding`, hook katalog layanan/ban, hook promo — hanya menambahkan pemicu refetch, tidak mengubah query atau logika bisnis.
- Banner memakai komponen toast yang sudah ada (`sonner`), tidak menambah dependency.
- Tidak menyentuh alur SPK, booking, auth, atau mekanisme versi/`VersionGate` yang sudah ada.

## Di luar cakupan

Update tampilan/fitur (kode) ke perangkat terpasang tanpa Play Store (OTA/live-update) tidak termasuk; itu perlu keputusan terpisah.
