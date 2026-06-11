## Tujuan

1. Tidak perlu pasang Google tag manual per halaman — cukup sekali di `index.html` karena ini SPA. Yang kurang adalah **kirim event `page_view` saat route React Router berpindah**, supaya halaman selain `/` ikut tercatat.
2. Hilangkan ketergantungan pada service account GA4 (Data API) untuk dashboard analytics di app, ganti dengan data internal Supabase.

## Apa yang akan diubah

### 1. `index.html` — bersihkan jadi 1 Measurement ID
- Hapus blok `G-GPJ743BLQS` (lama, dimuat lewat cookie consent) dan blok `gtag('config', 'G-R1H7RQCXJQ')` yang langsung jalan tanpa consent.
- Sisakan satu blok: bootstrap `dataLayer` + Consent Mode default `denied` (tetap GDPR-friendly), tanpa memuat `gtag.js`. Script tag hanya diinjeksi setelah user klik Setuju di banner.
- Hasil: 1 ID konsisten = `G-R1H7RQCXJQ`, dan tetap menghormati cookie consent.

### 2. `CookieConsentBanner.tsx` — load GA4 dengan ID baru
- Ganti `G-GPJ743BLQS` → `G-R1H7RQCXJQ`.
- Setelah accept: inject `gtag.js`, set `consent update`, kirim `page_view` pertama untuk path saat ini.

### 3. SPA page_view tracking (yang selama ini hilang)
- Tambah komponen kecil `GAPageviewTracker` di `src/components/GAPageviewTracker.tsx`.
- Mount di `App.tsx` di dalam `<BrowserRouter>` (di samping `RouteTracker`).
- Setiap kali `location.pathname + search` berubah dan `window.gtag` sudah ada (artinya user sudah accept cookies), kirim:
  ```
  gtag('event', 'page_view', { page_path, page_location, page_title });
  ```
- Ini menjawab pertanyaan "page mana lagi yang perlu ditambah Google tag" — jawabannya: tidak ada, karena tracker ini menangani semua route otomatis (`/`, `/katalog`, `/promo`, `/cabang`, `/booking`, `/loyalty`, `/profile`, dst).

### 4. Web Analytics dashboard — lepas GA4 API
- File: `src/components/admin/analytics/WebAnalyticsDashboard.tsx`.
- Hapus blok fetch ke edge function `ga4-analytics` dan KPI "Visitor (GA4)" yang menampilkan error GA4 belum siap.
- Ganti dengan KPI internal yang sudah ada datanya:
  - **Visitor App** = unique `user_id` aktif dari tabel `presence` / `activity_logs` pada range terpilih (fallback: jumlah session login dari `auth.users.last_sign_in_at`).
  - **Install PWA** = baca dari tabel `pwa_install_events` (sudah ada via `useInstallTracker`).
- Hapus state `ga`, `gaError`, `gaLoading` dan section "Web Analytics (GA4)" beserta panduan setup GA4.
- Tambah catatan kecil: "Visitor anonim dipantau di Google Analytics (G-R1H7RQCXJQ) — buka analytics.google.com".

### 5. Edge function GA4 — biarkan, tapi nonaktifkan dari UI
- Tidak menghapus `supabase/functions/ga4-analytics` (boleh dipakai nanti kalau service account sudah jalan), hanya tidak dipanggil dari UI.
- Secrets `GA4_PROPERTY_ID` & `GA4_SERVICE_ACCOUNT_JSON` boleh dibiarkan kosong — tidak akan ada error karena UI tidak lagi memanggilnya.

## Jawaban langsung pertanyaan Anda

- **"Page mana lagi yang perlu ditambah Google tag?"**
  Tidak ada. Aplikasi ini React SPA — `index.html` dimuat sekali untuk seluruh route. Yang benar adalah memasang tracker `page_view` saat route berubah (langkah 3), bukan menyisipkan `<script gtag>` ke tiap halaman.

- **"Bagaimana GA4 tanpa service account?"**
  Tetap pakai Google tag di browser (otomatis kirim data ke property GA4 Anda → laporan tersedia di analytics.google.com). Yang tidak bisa adalah **menarik laporan GA4 ke dalam dashboard app** — itu yang membutuhkan service account. Solusinya: dashboard app pakai data internal Supabase (langkah 4), dan untuk laporan visitor mendalam (sumber traffic, device, bounce rate, dll) Anda buka langsung di analytics.google.com.

## File yang disentuh

- `index.html` — rapikan jadi 1 ID + consent default denied
- `src/components/CookieConsentBanner.tsx` — pakai `G-R1H7RQCXJQ`, kirim page_view pertama
- `src/components/GAPageviewTracker.tsx` — baru
- `src/App.tsx` — mount `GAPageviewTracker` di dalam Router
- `src/components/admin/analytics/WebAnalyticsDashboard.tsx` — hapus blok GA4 API, ganti KPI ke data internal
