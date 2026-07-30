## Tujuan

Menambahkan tombol **Estimasi** pada card booking/faktur di Dashboard → Bookings, dengan UI identik dengan tabel Estimasi pada Canvas SPK Digital, dan data tersinkron dua arah dengan draft SPK milik booking tersebut. Total nominal pada card = harga servis + total estimasi.

## Sumber data (single source of truth)

Estimasi tetap disimpan di `spk_orders.data` dengan kunci yang sudah dipakai Canvas: `estimasi_items`, `estimasi_diskon_jasa`, `estimasi_diskon_sparepart`. Tidak ada tabel/kolom baru, jadi:
- Diisi dari card booking → langsung tampil di Canvas SPK.
- Diisi dari Canvas SPK → langsung tampil di card booking.

Booking dihubungkan ke SPK lewat `spk_orders.booking_id` yang sudah ada.

## Yang akan dibangun

1. **Komponen estimasi yang dipakai bersama**
   - Ekstrak isi visual `src/components/spk/canvas/v2/EstimasiTable.tsx` menjadi komponen terkontrol `EstimasiEditor` (props: items, diskon, onChange) di `src/components/spk/canvas/v2/EstimasiEditor.tsx`.
   - `EstimasiTable` (Canvas) tinggal membungkus `EstimasiEditor` dengan `useBinding` — tampilan Canvas tidak berubah sama sekali.
   - Tambah helper `src/lib/spk/estimasi.ts`: parsing item dari `spk_orders.data`, dan `computeEstimasiTotal()` (subtotal − diskon jasa − diskon sparepart).

2. **Tombol + dialog di card booking**
   - Di `src/components/admin/BookingsManager.tsx`, tambah tombol "Estimasi" pada card (dan baris tabel) yang membuka `BookingEstimasiDialog` baru berisi `EstimasiEditor` (glass UI sama persis).
   - Simpan → tulis ke `spk_orders.data` (merge non-destruktif, hanya kunci estimasi, tidak menyentuh field lain agar aman terhadap autosave Canvas).

3. **Draft SPK otomatis (lazy)**
   - Jika booking belum punya SPK, saat tombol Estimasi pertama kali disimpan, sistem membuat SPK draft via `SPKService.createFromBooking` (status draft, owner admin). Pembuatan bersifat lazy — tidak membuat ribuan SPK kosong untuk semua booking lama.
   - Jika SPK sudah ada, dialog memuat estimasi dari SPK tersebut.

4. **Total pada card**
   - Sekali query batch `spk_orders (id, booking_id, data)` untuk booking yang tampil, hitung total estimasi per booking.
   - Card menampilkan: harga servis, badge "+ Estimasi Rp x", dan **Total** = `service_price + total estimasi`. Bila estimasi 0, tampilan tetap seperti sekarang.
   - Nilai ikut diperbarui saat dialog disimpan dan saat realtime `spk_orders` berubah (memakai channel realtime yang sudah ada di modul SPK).

## Catatan teknis

- Tidak ada perubahan skema database, RLS, workflow, atau PDF; PDF SPK sudah membaca kunci estimasi yang sama sehingga otomatis ikut terisi.
- Penulisan estimasi memakai read-modify-write pada kolom `data` agar tidak menimpa hasil kerja mekanik.
- Total pada card bersifat turunan (dihitung saat render), bukan kolom baru, sehingga tidak pernah basi.
