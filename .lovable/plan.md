

# Sinkronisasi Hero → /booking + Tambah Layanan di Step Konfirmasi

## Tujuan
1. Saat user sudah memilih **layanan, kendaraan, dan tanggal** di hero beranda, halaman `/booking` langsung membuka **Step 4 (Konfirmasi)** — tidak perlu klik Lanjut 3x.
2. Di step Konfirmasi, tambahkan **CTA "Tambah Layanan Lain"** agar user mudah meng-upsell paket bookingnya.

## Perubahan

### 1. `src/components/mobile/home/HeroBookingForm.tsx`
- Saat user memilih kendaraan & tanggal dan klik **Booking Sekarang**, kirim juga **`time`** default (slot pertama yang valid hari itu) supaya wizard punya cukup data untuk lompat ke konfirmasi.
- Untuk **kendaraan dummy** (guest yang baru login lalu lanjut), kirim `car_type` (label mobil) sebagai query param `carType` agar bisa dipre-fill manual di wizard.
- Untuk **kendaraan tersimpan** (logged-in), tetap kirim `vehicle=<id>` seperti sekarang.
- Tambah default **`branch`** opsional (bila user pernah pilih) — saat ini hero belum punya pilihan cabang, jadi cabang tetap dipilih di wizard kalau belum ada.

### 2. `src/components/booking/MobileBookingWizard.tsx`

**A. Baca lebih banyak query params**
- Tambah pembacaan `vehicle` (UUID), `carType`, dan `plate` dari `searchParams`.
- Bila `vehicle` ada → fetch baris vehicle milik user, lalu set `selectedVehicleId`, `carType` (`brand model`), `carPlateNumber`, dan kalau cabang kosong tetap minta user pilih.

**B. Auto-jump ke Step 4**
- Setelah data layanan + kendaraan + tanggal/jam berhasil terisi dari URL **dan** semuanya valid (lulus `canNext` step 1–3), set `step = 4` sekali (pakai ref `didAutoJumpRef` agar tidak terulang).
- Jika ada bagian yang belum lengkap (mis. cabang kosong), lompat ke step paling awal yang masih perlu diisi (mis. step 2) — bukan ke step 4 — supaya UX tetap aman.

**C. CTA "Tambah Layanan Lain" di Step 4**
- Di bawah hero service card pada step 4, tambahkan tombol outline:
  - Label: **"+ Tambah Layanan Lain"** dengan ikon `Plus`.
  - Aksi: `setStep(1)` agar user kembali memilih layanan tambahan; state `selectedServiceIds` tetap (multi-select sudah didukung).
  - Setelah memilih layanan tambahan, user bisa langsung tap **"Lanjut ke Konfirmasi"** (tombol kedua di footer step 1 yang muncul **hanya kalau** `didAutoJumpRef.current === true` ATAU user sebelumnya pernah di step 4) — short-cut kembali ke step 4 tanpa harus melewati step 2 & 3 lagi.
- Tampilkan juga banner halus di hero card konfirmasi:
  > "💡 Ingin sekalian servis lain? Tambah layanan tanpa biaya admin tambahan."

**D. Footer step 1 saat dalam mode "tambah layanan"**
- Bila user kembali ke step 1 dari step 4, tombol **Lanjut** diganti **"Selesai — Kembali ke Konfirmasi"** yang langsung `setStep(4)`.

## Flow Hasil

```text
Beranda Hero ─► pilih layanan + kendaraan + tanggal ─► Booking Sekarang
       │
       ▼
/booking (auto step 4 — Konfirmasi)
       │
       ├─► Bayar Sekarang / Bayar di Tempat
       │
       └─► [+ Tambah Layanan Lain] ─► step 1 (multi-select)
                                       │
                                       └─► [Selesai] ─► kembali step 4
```

## Catatan Teknis
- Tidak ada perubahan database / RLS / edge function.
- Tidak menyentuh desktop `Booking.tsx` — sinkronisasi & CTA hanya di `MobileBookingWizard` (mobile-first, sesuai viewport user 390×844).
- Guard `didAutoJumpRef` mencegah loop saat user sengaja mundur ke step sebelumnya.
- Bila `vehicle` UUID di URL tidak ditemukan (mis. milik user lain) → fallback ke step 2 (manual entry) tanpa error.

## File Diubah
- `src/components/mobile/home/HeroBookingForm.tsx`
- `src/components/booking/MobileBookingWizard.tsx`

