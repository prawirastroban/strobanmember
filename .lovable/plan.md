## Tambah popup rincian booking saat card di-klik (Admin Bookings)

Saat staff/admin klik area card booking di `BookingsManager`, tampilkan Dialog "Rincian Booking" berisi seluruh detail data bookingan tanpa mengganggu kontrol yang sudah ada (status select, dropdown owner, popover catatan, tombol payment, dll).

### Perubahan

**File:** `src/components/admin/BookingsManager.tsx`

1. **State baru**
   - `const [detailBooking, setDetailBooking] = useState<Booking | null>(null);`

2. **Card jadi clickable di `renderBookingCard`**
   - Bungkus div luar dengan `onClick={() => setDetailBooking(booking)}` + `role="button"`, `tabIndex={0}`, cursor-pointer, dan hover ring halus.
   - Untuk mencegah popup terbuka ketika user klik kontrol di dalam card (Select status, Dropdown owner menu, Popover catatan, tombol payment, PickupActions, dll), tambahkan wrapper `<div onClick={(e) => e.stopPropagation()}>` pada:
     - Bagian kanan header (price + dropdown owner)
     - Popover catatan pelanggan (StickyNote)
     - Seluruh footer row (CTA + Select status + payment controls)
   - Tidak mengubah behaviour logic apapun.

3. **Dialog "Rincian Booking" (baru)**
   - Render satu Dialog di akhir komponen, dikontrol oleh `detailBooking`.
   - Konten: layout 2 kolom (di mobile stack) berisi:
     - **Status & Prioritas**: badge status, prioritas, action needed, cancel_requested.
     - **Jadwal**: tanggal lengkap + jam, dibuat pada (`created_at`), update terakhir.
     - **Pelanggan**: nama, phone (link `wa.me`), email, branch, kreator (staff/self-booking).
     - **Kendaraan**: tipe, plat, lokasi servis.
     - **Layanan**: nama service, type, harga (Rp format), payment status + method.
     - **Pickup** (jika ada): alamat, jarak km, status pickup, return, odometer start/end.
     - **Catatan Pelanggan**: full text (whitespace-pre-wrap).
     - **Alasan Pembatalan** (jika ada).
     - Tombol "Tutup" di footer.
   - Pakai komponen `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` yang sudah di-import.
   - Style minimal, mengikuti design system (semantic tokens), tanpa warna custom.

### Tidak diubah
- Logic data, query, atau permission.
- Tampilan mobile (`MobileBookingRow`) — hanya desktop card. Bisa di-extend nanti jika diminta.
- Tidak ada perubahan DB / RLS / edge function.
