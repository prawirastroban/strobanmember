# Rencana perbaikan preview blank putih secara menyeluruh

Masalah utama yang ditemukan:
- `src/components/AppErrorBoundary.tsx` masih punya auto-reload recovery yang bisa masuk loop saat error render terjadi.
- `src/main.tsx` masih melakukan cleanup service worker/cache saat startup; walau sudah di-background, ini tetap jalur risiko untuk preview iframe.
- `src/i18n/LanguageContext.tsx` membaca `localStorage` tanpa guard `try/catch`; jika storage di iframe gagal diakses saat reopen, render bisa crash sejak awal.
- `src/index.css` masih berisi override global sangat agresif dari perbaikan mobile sebelumnya, termasuk `* { writing-mode: ... !important }` dan aturan yang mengubah semua table di dashboard menjadi block. Ini harus dibuang.

## Yang akan saya lakukan

1. Stabilkan boot aplikasi
- Sederhanakan `src/main.tsx` agar fokus hanya mount React secepat mungkin.
- Hapus jalur cleanup startup yang berisiko memicu blank preview.
- Tambahkan guard root element yang aman.

2. Hentikan loop reload saat error
- Ubah `src/components/AppErrorBoundary.tsx` agar tidak auto-reload lagi.
- Tetap tampilkan fallback UI yang aman dan tombol reload manual.
- Jangan clear cache / unregister service worker otomatis saat error.

3. Hardening semua provider yang jalan saat startup
- Perbaiki `src/i18n/LanguageContext.tsx` agar semua akses `localStorage` aman dengan fallback default.
- Review dan jaga pola aman yang sudah ada di `ThemeContext` dan `AuthContext`.
- Pastikan crash di provider tidak lagi mematikan seluruh preview saat tab dibuka ulang.

4. Revert override CSS global dari 5 prompt terakhir
- Hapus blok CSS global di `src/index.css` yang memaksa writing mode horizontal untuk semua elemen.
- Hapus blok global yang auto-flatten semua table dashboard di mobile.
- Hapus styling global admin/mobile yang tidak benar-benar dibutuhkan untuk satu komponen.

5. Pertahankan hanya perubahan card list yang memang aman
- Biarkan `src/components/admin/ServiceManager.tsx` tetap memakai pola desktop table + mobile card list lokal komponen.
- Pertahankan `src/components/admin/PromosManager.tsx` dengan pola serupa bila sudah aman, tanpa bergantung ke override CSS global.
- Jangan ubah fetching, query, mutation, atau action handler.

6. Rapikan dampak samping visual yang terkait blank/overrides
- Cek `src/components/admin/AdminLayout.tsx` agar tidak lagi bergantung pada selector global `[data-dashboard-content]` untuk fix layout.
- Pastikan layout dashboard mobile tetap rapi hanya lewat class lokal komponen, bukan CSS global paksa.

7. Verifikasi hasil
- Pastikan preview bisa dibuka ulang tanpa blank putih.
- Pastikan saat terjadi runtime error, user melihat fallback UI, bukan layar putih loop.
- Pastikan halaman admin yang sudah diubah tetap menampilkan card list di mobile dan table di desktop.
- Pastikan tidak ada lagi override CSS global yang memengaruhi seluruh app.

## File yang akan disentuh
- `src/main.tsx`
- `src/components/AppErrorBoundary.tsx`
- `src/i18n/LanguageContext.tsx`
- `src/index.css`
- `src/components/admin/ServiceManager.tsx`
- `src/components/admin/PromosManager.tsx`
- `src/components/admin/AdminLayout.tsx` (jika perlu pembersihan atribut/ketergantungan global)

## Detail teknis
- Tidak ada perubahan database, auth config, query backend, mutation, atau edge function.
- Fokus perbaikan adalah startup safety, error recovery safety, dan CSS scope containment.
- Pendekatan ini mengikuti prinsip: render dulu, jangan reload otomatis, jangan akses storage tanpa guard, dan jangan pakai CSS global untuk memperbaiki satu halaman.

Setelah Anda approve, saya akan implementasikan langsung dan targetnya mengembalikan preview ke state stabil lalu menyisakan hanya card list lokal-komponen yang aman.