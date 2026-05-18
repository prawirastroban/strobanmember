## Tujuan

Memastikan setiap kartu booking di `/dashboard/bookings` selalu menampilkan data yang sama dengan record `bookings` di database — termasuk perubahan dari device lain, dari webhook pembayaran, atau dari admin lain — tanpa perlu refresh manual.

## Masalah sinkronisasi yang ditemukan

Setelah audit `BookingsManager.tsx`:

### 1. Bug urutan merge `payMethodMap` (line 211)
```ts
setPayMethodMap((prev) => ({ ...m, ...prev }));
```
`prev` menimpa data fresh dari DB → kalau metode pembayaran di tabel `payments` berubah (webhook Midtrans, admin lain), nilainya tidak pernah ter-refresh di UI.

### 2. Payment method tidak ikut realtime
`payMethodMap` cuma di-fetch satu kali saat `bookings.length` berubah. Tidak ada subscription ke tabel `payments`, jadi update payment_method/payment_status dari sumber lain tidak terlihat sampai user reload.

### 3. Dropdown Status Bayar memangkas 5 → 3 state (line 837)
Badge header benar menampilkan `Lunas / Bayar di Tempat / Menunggu / Gagal / Belum Lunas`, tapi dropdown hanya punya 3 opsi (`paid / pending / unpaid`). Logic value-nya:
```ts
booking.payment_status === "paid" ? "paid" :
booking.payment_status === "pending" ? "pending" : "unpaid"
```
Jika status sebenarnya `pay_later` atau `failed`, dropdown menampilkan "unpaid" → kalau admin tidak sengaja klik save, statusnya akan ditimpa jadi `unpaid` dan kehilangan info `pay_later`/`failed`. Inkonsisten dengan badge atas.

### 4. Realtime INSERT tidak hormati filter aktif
Booking baru di-prepend ke `setBookings` apa pun filter status/branch/timeline-nya. Hasilnya kartu bisa muncul yang seharusnya tersembunyi → terlihat seperti data tidak sinkron dengan filter.

### 5. `service_price` tidak ditampilkan di kartu
Padahal sudah ada di record. Admin perlu melihat nominal saat memutuskan pembayaran. Bukan bug sync, tapi membantu sinkronisasi visual antara CTA "Bayar Sekarang" dan jumlah yang harus dibayar.

## Rencana perbaikan (UI + handler, tanpa ubah skema)

### A. Fix merge order `payMethodMap`
Balik jadi `({ ...prev, ...m })` supaya fetch terbaru selalu menang. Tambah `creatorMap` dan `payMethodMap` ke dependency yang tepat.

### B. Realtime subscription untuk `payments`
Tambah channel kedua:
```ts
supabase.channel("payments-realtime")
  .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (payload) => {
    const row = payload.new as any;
    if (!row?.booking_id) return;
    setPayMethodMap((prev) => ({ ...prev, [row.booking_id]: row.payment_method }));
    // Sync payment_status dari payments ke booking lokal kalau berbeda
    setBookings((prev) => prev.map((b) =>
      b.id === row.booking_id && b.payment_status !== row.payment_status
        ? { ...b, payment_status: row.payment_status } : b
    ));
  }).subscribe();
```

### C. Dropdown Status Bayar lengkap 5 opsi
Ubah `PAY_STATUS_OPTIONS` jadi 5 entry: `Lunas / Menunggu / Belum Lunas / Bayar di Tempat / Gagal`. Pakai `booking.payment_status` langsung sebagai value (tanpa mapping yang memotong). Kalau value tidak dikenal, tampilkan dengan fallback "Belum Lunas".

### D. Realtime INSERT hormati filter
Saat menerima event INSERT, hanya prepend ke list jika cocok dengan `statusFilter`, `branchFilter`, dan `dateRange`. Kalau tidak cocok, cukup tampilkan toast notifikasi tapi tidak ubah list.

### E. Auto re-fetch saat dropdown filter berubah (sudah)
Verifikasi kalau `paymentMethodFilter` aktif, daftar tetap di-filter pakai `payMethodMap` yang sudah ter-update via realtime.

### F. Tampilkan `service_price` & timestamp update
Di header kartu, tambah nominal: `Rp 150.000` di sebelah waktu. Di footer, tooltip kecil "Diperbarui {relative time}" supaya admin tahu kapan terakhir berubah.

### G. Re-fetch `payMethodMap` saat realtime UPDATE booking dari status `unpaid → paid` tanpa edit lokal
Sudah otomatis ter-cover oleh (B) karena webhook Midtrans menulis ke `payments` juga, tapi tetap pasang fallback: kalau receive UPDATE dengan `payment_status` berubah dan tidak ada `payMethodMap` entry, ambil ulang.

## File yang disentuh
- `src/components/admin/BookingsManager.tsx` — UI + handler subscriptions (semua logika sinkronisasi terpusat di sini).

Tidak ada perubahan database, edge function, RLS, atau schema.

## Hasil yang diharapkan
- Badge atas, primary CTA, dropdown status bayar, dan dropdown metode di setiap kartu **selalu menampilkan nilai yang sama dengan record DB**, baik saat: admin sendiri mengubah, admin lain mengubah, webhook Midtrans masuk, atau pickup driver update lokasi.
- Tidak ada lagi case "dropdown menyembunyikan state asli" (pay_later/failed → unpaid).
- Booking baru dari customer hanya muncul di list kalau lolos filter aktif.
