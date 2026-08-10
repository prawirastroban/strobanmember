# Onboarding Pengguna Baru (Tur Fitur + Lengkapi Data)

Saat pengguna pertama kali membuka aplikasi, aplikasi menuntun mereka lewat alur singkat: mengisi nomor WhatsApp, data kendaraan pribadi, lalu tur fitur utama.

## Alur

```text
Login pertama kali
  -> Langkah 1: Selamat datang (sapaan + ringkasan manfaat)
  -> Langkah 2: Nomor WhatsApp (wajib)
  -> Langkah 3: Data kendaraan (merk, model, tahun, plat) - bisa "Nanti saja"
  -> Langkah 4: Tur fitur singkat (Booking, Katalog, Riwayat, Loyalty/Referral, Notifikasi)
  -> Selesai -> ditandai selesai, tidak muncul lagi
```

- Tampil sebagai bottom sheet full-screen di mobile dan dialog di desktop, dengan indikator langkah (1/4) serta tombol Lanjut / Kembali / Lewati.
- Setelah selesai, homepage menampilkan kartu "Checklist Akun" kecil bila masih ada data yang belum lengkap (misal kendaraan belum diisi).
- Tidak tampil di halaman auth, reset password, halaman publik tracking/review, dan dashboard staff/admin. Hanya untuk pengguna customer.

## Integrasi dengan yang sudah ada

- Gate WhatsApp yang ada (`WhatsAppRequiredGate`) tetap menjadi jaring pengaman, tetapi tidak muncul selama onboarding berjalan agar tidak dobel popup, memakai antrean overlay yang sudah ada (`OverlayQueueContext`) dengan prioritas: onboarding > promo popup > gate WA.
- Nomor WhatsApp disimpan ke `profiles.phone` (format +62, sama seperti gate saat ini); data kendaraan disimpan ke tabel `vehicles` yang dipakai halaman "Kendaraan Saya".

## Rincian teknis

1. Migration: tambah kolom `profiles.onboarding_completed_at timestamptz null` dan `profiles.onboarding_step smallint default 0` agar progres bisa dilanjutkan bila pengguna keluar di tengah jalan. Tidak ada tabel baru; kebijakan RLS profil yang ada sudah mengizinkan pemilik memperbarui barisnya.
2. `src/hooks/useOnboarding.ts` - membaca profil (phone, onboarding_completed_at) dan jumlah kendaraan, menentukan `shouldShow`, menyediakan `saveStep` dan `complete`.
3. `src/components/onboarding/OnboardingWizard.tsx` - kerangka wizard (progress, navigasi) dengan langkah terpisah: `StepWelcome.tsx`, `StepWhatsApp.tsx` (validasi zod, prefix +62, tanpa 0 di depan), `StepVehicle.tsx` (insert ke `vehicles`), `StepTour.tsx` (kartu fitur + tombol "Mulai pakai").
4. Tambah `"onboarding"` ke `OverlayName` dan taruh paling atas pada `PRIORITY`; `WhatsAppRequiredGate` melewati tampilannya saat onboarding aktif.
5. Pasang `<OnboardingWizard />` satu kali di layout global (`App.tsx`, bersama gate dan popup lain), bukan per halaman.
6. `src/components/mobile/home/AccountChecklistCard.tsx` - kartu checklist ringkas di homepage mobile, hanya tampil jika masih ada item yang belum lengkap.
7. Seluruh teks Bahasa Indonesia; gaya visual mengikuti liquid glass dengan aksen merah #ff2b2b yang sudah dipakai.