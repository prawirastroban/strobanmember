## Penyederhanaan Tombol Bukti Transfer

Saat ini tombol "Bukti" di dashboard bookings, transaksi, dan payment punya banyak varian visual (kuning pulse "Verifikasi", hijau "OK", merah "Ditolak", abu "Belum Ada", biru default, mode "Upload Bukti"). Ini ramai dan tidak konsisten dengan tombol aksi lain di baris yang sama.

Permintaan: buat sederhana — kalau ada bukti, tombol bisa diklik (satu gaya saja); kalau tidak ada bukti, tombol tidak muncul sama sekali.

### Perubahan

**File:** `src/components/admin/keuangan/TransferProofButton.tsx`

1. **Hilangkan semua varian status visual** (`isPending`, `isApproved`, `isRejected`, `isEmpty`, animasi `animate-pulse`, warna amber/emerald/red/blue/muted).
2. **Hilangkan mode "Upload Bukti"** dari tombol ini — props `allowUpload`, `customerUserId`, `customerName`, `servicePrice`, `UploadProofDialog`, dan state `uploadOpen` dibuang. Tombol murni untuk **melihat** bukti.
3. **Auto-hide** ketika `hasProof === false` atau masih `null` (loading) — tombol tidak dirender sama sekali.
4. **Satu gaya tombol** yang sama seperti tombol aksi lain di baris (ghost, h-7, text-xs, ikon `Receipt`, label `"Bukti"`).
5. Hapus state `latestStatus` dan kolom `status` dari query awal (cukup cek keberadaan baris).
6. Dialog detail bukti tetap dipertahankan apa adanya (preview gambar/PDF, info pengirim, salin URL, download, buka tab baru).

### Dampak pada caller (tidak perlu perubahan logika, hanya pembersihan prop yang tidak dipakai)

- `src/components/admin/BookingsManager.tsx` — hapus prop `allowUpload`, `customerUserId`, `customerName`, `servicePrice`, `onChanged` yang dioper ke `TransferProofButton`. Fungsi upload bukti oleh admin (jika masih diperlukan) tetap tersedia lewat alur lain (mis. `PaymentsManager` / `InlineProofUpload`) — tidak diubah dalam plan ini.
- `src/components/admin/MobileBookingRow.tsx` — sama, hanya kirim `bookingId` (+ opsional `paymentMethod`).
- `src/components/admin/PaymentsManager.tsx` & `TransactionHistory.tsx` — sudah memakai mode view-only, tidak ada perubahan perilaku.

### Hasil akhir

- Baris booking/transaksi/payment yang **belum** ada bukti transfer: tombol Bukti tidak muncul (sama seperti sekarang dari sisi user — tapi tanpa varian "Belum Ada" abu-abu).
- Yang **sudah** ada bukti: muncul tombol ghost standar `[📄 Bukti]` yang bisa diklik untuk membuka dialog preview. Tidak ada warna status, tidak ada animasi.

### Verifikasi

- Type-check bersih setelah prop dibersihkan di semua caller.
- Cek visual di `/dashboard/bookings` (desktop & mobile): tombol hanya muncul untuk booking yang punya bukti dan tampil seragam dengan tombol aksi lainnya.