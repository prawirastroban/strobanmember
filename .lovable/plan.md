## Tujuan

Tombol "Buka Booking", "Buka Pembayaran", dan "Riwayat Customer" di Pusat Kontrol Operasional (`/dashboard/feedback`) — baik di dropdown baris maupun di detail sheet — harus **langsung membuka data yang bersangkutan** (booking, pembayaran, atau customer tertentu), bukan hanya mendarat di halaman kosong.

## Kondisi Saat Ini

- `Buka Booking` → `/dashboard/bookings?id={id}`, tapi `BookingsManager` **tidak membaca** param `id`, sehingga hanya membuka daftar biasa.
- `Buka Pembayaran` → `/dashboard/payments` (tidak membawa `id` sama sekali) → di-redirect ke `/dashboard/history?tab=payments` menampilkan seluruh transaksi.
- `Riwayat Customer` → `/dashboard/customers/{userId}` — sudah berfungsi karena route `customers/:id` sudah ada.

## Perubahan

### 1. `FeedbackControlCenter.tsx`
- `goPayment`: kirim `booking` param → `/dashboard/history?tab=payments&booking={bookingId}` (fallback ke `payment={paymentId}` bila `bookingId` kosong).
- `goBooking`: tetap `/dashboard/bookings?id={bookingId}` (target sudah benar; hanya penerima yang perlu diperbaiki).

### 2. `BookingsManager.tsx` — auto-open detail dari URL
- Tambah `useEffect` yang membaca `searchParams.get("id")`.
- Jika ada:
  1. Cari booking dari state `bookings`. Bila ketemu → `setDetailBooking(...)`.
  2. Bila belum ada di state (mis. karena filter cabang/tanggal menyembunyikannya) → fetch satu row langsung dari `bookings` by id lalu `setDetailBooking(...)`.
  3. Bersihkan param `id` dari URL (`setSearchParams(..., { replace: true })`) supaya tidak reopen saat user menutup dialog.
- Tidak mengubah logic list/filter lain — hanya menambah pembukaan detail.

### 3. `PaymentsManager.tsx` — auto-highlight & filter by URL
- Tambah `useSearchParams`; baca `booking` dan `payment`.
- Jika ada:
  1. Set filter pencarian internal ke ID tersebut supaya baris terkait muncul di atas.
  2. Setelah data ter-render, scroll ke row (`scrollIntoView`) dan beri highlight sementara (mis. ring `#ff2b2b/40` selama ~2.5 detik) via `data-highlight` + kelas Tailwind.
  3. Bersihkan param dari URL setelah dijalankan sekali.
- Jika `PaymentsManager` sudah punya state pencarian/filter → gunakan itu. Jika belum, tambah state `focusId` sederhana yang dipakai untuk membandingkan `p.id` / `p.booking_id`.

### 4. Verifikasi
- Klik "Buka Booking" pada item feedback → dialog detail booking langsung terbuka dengan data booking tersebut.
- Klik "Buka Pembayaran" → halaman payments terbuka, baris pembayaran booking tersebut ter-highlight & ter-scroll.
- Klik "Riwayat Customer" → halaman `CustomerDetail` (sudah OK, tanpa perubahan).

## Detail Teknis (ringkas)

```text
FeedbackControlCenter
  goPayment(item) → navigate(`/dashboard/history?tab=payments&booking=${item.bookingId ?? ""}&payment=${item.paymentId ?? ""}`)

BookingsManager (setelah bookings ter-load)
  const focusId = searchParams.get("id")
  if (focusId) {
    const b = bookings.find(x => x.id === focusId)
      ?? (await supabase.from("bookings").select("*").eq("id", focusId).maybeSingle()).data
    if (b) setDetailBooking(b)
    clear "id" from searchParams (replace)
  }

PaymentsManager
  const focusBooking = params.get("booking"); const focusPayment = params.get("payment")
  useEffect → cari row match, scrollIntoView + kelas highlight sementara, hapus param.
```

## Cakupan

Hanya frontend/presentational: 3 file di atas. Tidak ada perubahan database, RLS, hook auth, atau logic booking/payments lainnya.
