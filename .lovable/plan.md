## Goal
Halaman SPK Detail (`/spk/:id`) saat ini render fullscreen tanpa shell dashboard. User ingin halaman ini tetap berada dalam kerangka `/dashboard` (sidebar + topbar + breadcrumb) seperti halaman admin lainnya.

## Perubahan

**1. `src/pages/spk/SPKDetail.tsx`**
- Bungkus `<SPKCanvas />` dengan `<AdminLayout title="SPK Detail">` sehingga sidebar, topbar tabs, dan breadcrumb tetap tampil.
- Tidak mengubah URL (`/spk/:id` tetap) — hanya menambahkan shell layout. Breadcrumb `spk` sudah terdaftar di `Breadcrumbs.tsx`.

**2. `src/pages/spk/SPKCanvas.tsx` (penyesuaian ringan)**
- Karena AdminLayout sudah menyediakan header/topbar dan scroll container sendiri, hapus/atur ulang wrapper `min-h-screen` di Canvas agar tidak dobel scroll. Sticky progress header tetap sticky terhadap `<main>` dari AdminLayout.
- Tombol back di Canvas tetap ada (kembali ke `/spk`).

**3. Konsistensi (opsional, dalam scope yang sama)**
- Terapkan pola yang sama untuk `/spk` (SPKWorkQueue) dan `/spk/new` (SPKNewForm) hanya jika saat ini juga fullscreen — supaya semua rute SPK operasional konsisten di dalam shell dashboard. `/spk/:id/print` **tetap** fullscreen (khusus print).

## Yang tidak berubah
- Tidak ada perubahan runtime / workflow / automation / RLS / edge function.
- Tidak mengubah URL rute.
- Tidak mengubah `SPKPrint` (harus tetap fullscreen untuk cetak).
