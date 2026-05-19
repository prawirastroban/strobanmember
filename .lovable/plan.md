## Konteks
Section upload bukti sudah ada di `MyBooking.tsx` (line 506–561), tapi gating-nya terlalu ketat:
```
payAllowed (status confirmed) && payment_method ∈ (transfer, qris) && payment_status !== 'paid'
```
Akibatnya bukti tidak muncul saat:
- Booking masih `waiting_confirmation` (belum bisa attach apa-apa)
- `payment_status === 'paid'` (bukti yang sudah diupload jadi hilang dari tampilan)

## Tujuan
Tampilkan blok lampiran bukti **setiap kali** metode pembayaran adalah `transfer` atau `qris` (selain `cash`), dengan perilaku berbeda sesuai state.

## Perubahan

### `src/pages/MyBooking.tsx` — section bukti (line 506–561)

Ubah kondisi visibility menjadi:
```
isOwner && booking.status !== 'cancelled' && (booking.payment_method === 'transfer' || booking.payment_method === 'qris')
```

State-aware behaviour di dalam section:

| State                          | Tampilan                                                                 |
|--------------------------------|--------------------------------------------------------------------------|
| Belum confirmed (`!payAllowed`)| Pesan kecil: "Upload bukti tersedia setelah booking dikonfirmasi admin." Tombol disabled. |
| Confirmed, belum ada bukti     | Tombol **"Upload Bukti Transfer / QRIS"** → `/payment/manual/:id` (existing). |
| Sudah ada bukti, status pending| Preview thumbnail + status "menunggu verifikasi" + tombol Lihat (existing). |
| Sudah ada bukti, rejected      | Preview + tombol "Upload ulang" (existing).                              |
| Sudah `paid`                   | Preview thumbnail + label hijau **"Bukti diterima · Lunas"** read-only (tanpa tombol upload). |

Header section ditambah judul kecil "Lampiran Bukti Pembayaran" + icon `Paperclip` agar jelas ini bagian terpisah dari card status.

## Hasil
- Customer dengan metode transfer/QRIS selalu melihat status lampiran bukti di card pembayaran.
- Setelah pembayaran lunas, bukti tetap terlihat sebagai arsip (tidak hilang).
- Saat booking belum dikonfirmasi, customer paham harus menunggu admin.
