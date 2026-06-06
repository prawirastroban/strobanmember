## Masalah

Pada halaman Checkout (Booking), bagian "Kode Penukaran" hanya menampilkan input kosong "MASUKKAN KODE PENUKARAN" — voucher promo yang sudah diklaim user (mis. `Cashback 20%`, `STROBANWEB-…`) tidak ikut muncul, padahal datanya ada di `promo_claims` dengan `status='active'` dan memenuhi kategori layanan yang dipilih.

### Akar Masalah di `src/components/booking/RedemptionCodeInput.tsx`
1. **Voucher hanya tampil bila ada "rekomendasi terbaik"** — kalau `fetchAllCodes` gagal silent (mis. nested join `promos (...)` ter-block RLS / cache PostgREST) atau race terhadap `selSig`, `availableCodes` tetap `[]` dan UI jatuh ke input manual, sehingga user tidak tahu vouchernya ada.
2. **Daftar voucher tersembunyi di balik Popover ikon `Tag` kecil** di dalam input — tidak ada indikator jumlah voucher, jadi user tidak tahu harus menekan ikon itu.
3. **Auto-apply hanya jalan kalau `selectedServiceIds/Categories` sudah ada** — bila cart masih loading, voucher tidak ter-apply meski eligible.
4. **Error fetch ditelan** (`console.error` saja) sehingga regresi seperti ini tak terdeteksi.
5. **Render menampilkan "Cek promo lainnya" hanya saat ada `bestRecommendation`** — tidak ada CTA permanen "Lihat voucher saya (N)".

## Perbaikan

### 1. `RedemptionCodeInput.tsx` — selalu permukaan voucher yang dimiliki
- Tambah state `loadError` & `hasLoadedOnce`. Kalau fetch error, tampilkan baris kecil: `Gagal memuat voucher — coba lagi` dengan tombol retry.
- Pisahkan fetch jadi 3 query independen dengan `Promise.allSettled` (reward / promo / referral) supaya satu query gagal tidak menggugurkan dua lainnya.
- Hapus nested join `promos (...)` yang rentan RLS; ambil dulu `promo_claims` lalu fetch detail `promos` via `.in('id', ids)` terpisah. Sama untuk `rewards`. Ini menghilangkan kegagalan silent karena join.
- Tampilkan **selalu** sebuah panel ringkas "Voucher Saya (N)" persis di atas / di dalam komponen, dengan list maksimal 3 voucher eligible + tombol "Lihat semua N" untuk membuka popover lengkap. Bila `N=0`, tampilkan teks halus "Belum ada voucher — Lihat promo" yang menuju `/promo`.
- Auto-apply best voucher juga jalan saat **selSig kosong** (sebelum cart selesai loading) — pakai filter generic-only (`applicable_categories=[] && applicable_service_ids=[]`) supaya tidak salah pasang, lalu re-evaluasi saat selSig berubah.
- Re-fetch (load) saat `userId` berubah dari undefined → defined (sudah), plus saat `appliedRedemption` di-remove (refresh daftar).

### 2. Realtime sinkronisasi klaim
- Subscribe channel `postgres_changes` ke tabel `promo_claims` filter `user_id=eq.{userId}` di komponen — bila user klaim voucher baru di tab lain (atau dari `VoucherClaimCard`), checkout langsung memunculkannya tanpa reload.

### 3. UI/UX — sesuai screenshot
- Ganti placeholder "MASUKKAN KODE PENUKAR…" dengan teks pendek `Punya kode? Tempel di sini`.
- Di sebelah tombol `Terapkan`, tambahkan tombol sekunder kecil bertuliskan "Voucher Saya (N)" yang membuka popover daftar voucher — selalu visible, bukan hanya ikon `Tag` di dalam input.
- Pada applied state, tampilkan label kategori berlaku (mis. "Berlaku: Maintenance, Tune-up") agar user paham kenapa voucher cocok / tidak.

### 4. Penanda kategori voucher yang tidak cocok
- Tetap tampilkan voucher yang **tidak** eligible di akhir list dengan opacity 50 % + badge "Tidak berlaku untuk layanan ini" — biar user tahu vouchernya ada, hanya tidak match. (Saat ini disembunyikan total.)

### 5. Logging
- Tambah `console.warn` ringkas bila count `promo_claims` > 0 tapi setelah filter hasil 0, untuk memudahkan debug ke depan.

## File yang Diubah
- `src/components/booking/RedemptionCodeInput.tsx` (refactor fetch + render utama)
- Tidak ada perubahan DB / RLS / migration.
- Tidak ada perubahan di `Booking.tsx` & `MobileBookingWizard.tsx` (props tetap sama).

## Verifikasi
1. Login sebagai user yang punya `promo_claims.status='active'` (mis. `STROBANWEB-…`).
2. Buka `/booking?service=…&cart=1`, scroll ke "Kode Penukaran" — harus muncul card "Voucher Saya (N)" + voucher pertama otomatis ter-apply bila eligible.
3. Klik "Voucher Saya" → popover menampilkan semua klaim termasuk yang tidak match (dengan label peringatan).
4. Klaim voucher baru dari tab lain → checkout langsung refresh tanpa reload.
5. Simulasikan error (matikan jaringan) → muncul baris "Gagal memuat voucher — coba lagi".
