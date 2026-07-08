## Tujuan
Mengaktifkan tiga panel di **Web Analytics** yang saat ini kosong / statis:
1. **Top Booked Services · 7 Hari**
2. **Top Cities · 7 Hari**
3. **Insight & Rekomendasi** (auto‑report berbasis AI)

## Temuan investigasi
- `Top Booked Services` sebenarnya sudah query ke `bookings + services`. Yang bikin kosong: seringkali 7 hari terakhir memang belum ada booking → tampil "Belum ada booking pada periode ini." Perlu fallback + tampilan visual.
- `Top Cities` **tidak akan pernah aktif** karena tabel `bookings` **tidak punya kolom `city`**. Kolom lokasi yang tersedia: `pickup_address`, `service_location`, `branch`, `created_branch`.
- `Insight & Rekomendasi` masih placeholder — belum memanggil AI.

## Perubahan yang akan dilakukan

### 1. Top Booked Services jadi hidup
- Tetap pakai range aktif (Hari Ini / 7 Hari / 30 Hari).
- Tambah **mini bar** proporsional (bar horizontal di dalam list) supaya visual, bukan cuma angka.
- Kalau list kosong untuk range terpilih, otomatis coba fallback ke 30 hari terakhir dan tampilkan badge kecil "Menampilkan 30 hari (7 hari kosong)".

### 2. Top Cities benar‑benar aktif
Karena kolom `city` tidak ada, ekstrak kota dari data yang ada dengan prioritas:
1. Segment terakhir dari `pickup_address` (setelah koma terakhir, di‑trim & di‑Title Case).
2. Kalau kosong, ambil dari `service_location`.
3. Kalau tetap kosong, fallback ke `branch` (diberi prefix "Cabang ...").

Query ambil kolom `pickup_address, service_location, branch` dari `bookings` untuk range aktif, lalu aggregate di client. Hasilnya top 5 lokasi + count. Copy footer diganti jadi "Diturunkan dari alamat pickup / lokasi layanan / cabang" — bukan lagi menuntut kolom `city`.

### 3. Insight & Rekomendasi otomatis (Gemini via Lovable AI Gateway)

**Backend — edge function baru `analytics-insights`:**
- Menerima payload ringkasan (range, newUsers, bookings, completed, revenue, revenuePaid, topServices, topCities, topBranches, peakHours, statusFunnel, trend).
- Verifikasi JWT + pastikan caller `admin` atau `staff` (via `user_roles` + `has_role`), jika tidak → 403.
- Panggil Lovable AI Gateway `google/gemini-2.5-flash` dengan system prompt "Kamu analis operasional bengkel Stroban…" dan user prompt berisi ringkasan JSON.
- Hasil: markdown singkat (1 paragraf ringkasan + 3–5 bullet rekomendasi aksi dalam Bahasa Indonesia).
- Return `{ insight: string, generated_at }`.
- Handle rate limit 429 & credit 402 dengan pesan yang jelas.

**Frontend — `WebAnalyticsDashboard.tsx`:**
- Setelah data agregasi selesai, otomatis panggil edge function `analytics-insights` sekali per perubahan range.
- Card "Insight & Rekomendasi" berubah jadi:
  - State loading → skeleton.
  - State success → render markdown (heading kecil + bullet list) + timestamp "Diperbarui HH.mm" + tombol **↻ Perbarui**.
  - State error → pesan singkat + tombol coba lagi.
- Debounce: kalau user cepat pindah range, batalkan panggilan sebelumnya.

## Yang TIDAK diubah
- Tidak menambah kolom `city` di database, tidak mengubah schema.
- Tidak menyentuh sumber data booking / logic booking.
- KPI, tren harian, funnel, jam sibuk, top cabang, dan panel Google Analytics link‑out tetap seperti sekarang.

## Detail teknis singkat
- File yang diedit: `src/components/admin/analytics/WebAnalyticsDashboard.tsx`.
- File baru: `supabase/functions/analytics-insights/index.ts` + entry di `supabase/config.toml` (`verify_jwt = true`).
- AI: Lovable AI Gateway (`LOVABLE_API_KEY` sudah tersedia), model default `google/gemini-2.5-flash` — hemat & cepat, cocok untuk ringkasan tekstual.
- Tidak ada tabel baru, tidak ada migration.
