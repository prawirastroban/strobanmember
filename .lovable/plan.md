## Tujuan
Tambahkan **timeline informasi** dan **detail penting** pada kartu booking di `BookingsManager.tsx` (desktop card) agar staff bisa cepat tahu kapan booking dibuat, sudah berapa lama, dan konteks penting lainnya — tanpa harus membuka detail.

## Yang Ditambahkan

Sebuah baris **footer-meta** baru tepat di atas tombol aksi (antara grid info dan border-t footer), berisi chip-chip kecil (`text-[10px]`, icon 3x3) yang menampilkan:

1. **Dibuat** — `Clock` + "Dibuat 2 jam lalu" (relatif, `formatDistanceToNow` Bahasa Indonesia) + tooltip tanggal absolut lengkap (`15 Okt 2023 14:30`).
2. **Hitung mundur jadwal** — `Hourglass`:
   - Jika belum lewat: "Mulai dalam 3 jam" (hijau jika >2h, amber jika ≤2h, merah jika ≤30m / lewat).
   - Jika sudah lewat & belum selesai: "Terlambat 45 menit" (merah).
3. **Update terakhir** — `RefreshCw` + "Update 5 menit lalu" (pakai `updated_at`); hanya tampil jika `updated_at` beda signifikan dari `created_at` (>1 menit).
4. **Sumber booking** — `Smartphone` / `Globe` / `UserCog`:
   - "via Aplikasi" (self-booking), "via Web" (jika ada `metadata.source = web`), atau "via Staff" (sudah ada di header, jadi di sini hanya tampilkan channel jika tersedia di `metadata` / `booking_channel`).
5. **Metode pembayaran** — `CreditCard` + label (Cash / Transfer / QRIS / Midtrans) — hanya tampil jika `payment_method` ada.
6. **Indikator catatan/komplain** — `MessageSquareWarning` "Ada koreksi" jika `status_change_requests` pending (sudah ada `cancel_requested`; untuk koreksi kita re-use field yang ada saja tanpa query baru).

Semua chip pakai `Badge variant="outline"` ukuran `h-5 text-[10px]` agar konsisten dengan badge header. Layout: `flex flex-wrap gap-1.5`.

## Lokasi Perubahan

Hanya satu file:
- `src/components/admin/BookingsManager.tsx` — sisipkan blok baru antara baris **1110** (penutup grid) dan **1112** (komentar Footer row).

Helper waktu relatif: pakai `formatDistanceToNow` dari `date-fns` + `idLocale` (keduanya sudah di-import di file ini).

## Yang TIDAK Diubah
- Tidak ubah query/data fetching, RLS, atau struktur DB.
- Tidak ubah mobile card / dialog detail.
- Tidak ubah komponen lain.

## Tampilan Akhir (preview ASCII)

```text
[TINGGI] [Konfirmasi] [Belum Lunas] [Self-Booking]   🕐 11 Jun · 09:00  Rp 50.000  ⋮
👤 Eka Andi Nirwana       🚗 Toyota Avanza      🔧 Tebus Murah Spooring
   082242627385              AD 1768 PZ
   📍 yogyakarta
─────────────────────────────────────────────────────────────────────────────
🕐 Dibuat 2 jam lalu  ⏳ Mulai dalam 3 jam  🔄 Update 5 mnt lalu  💳 Transfer
─────────────────────────────────────────────────────────────────────────────
[CTA]  [Status ▼]  ...
```
