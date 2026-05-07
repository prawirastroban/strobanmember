## Tujuan
Menggabungkan fitur **Scan QR Booking** ke dalam halaman **Confirmation Bookings** sebagai toolbar di atas tabel, sehingga sidebar lebih ringkas. Sekaligus memberi rekomendasi konsolidasi menu lain yang fungsinya tumpang tindih.

## Bagian 1 — Gabungkan Scanner ke Confirmation Bookings

### Perubahan UI
Di `src/components/admin/BookingsManager.tsx`, di bagian header `Card` (sebelah kanan judul "Confirmation Bookings"), tambahkan tombol baru:

```
[ Scan QR / Cari Kode Booking ]
```

Tombol ini membuka sebuah `Dialog` (modal) berisi konten `BookingScanner` yang sudah ada. Setelah konfirmasi pembayaran berhasil di scanner, dialog menutup otomatis dan tabel bookings refresh (realtime listener sudah aktif, jadi otomatis update).

### Perubahan Sidebar
Di `src/components/admin/AdminSidebar.tsx`:
- Hapus item menu **"Scan QR Booking"** (`/dashboard/scanner`).
- Route `/dashboard/scanner` tetap aktif sebagai redirect ke `/dashboard/bookings?action=scan` agar bookmark lama tidak rusak. Saat halaman dibuka dengan query `?action=scan`, dialog scanner otomatis terbuka.

### Hak Akses
Tidak berubah — `BookingsManager` sudah dibatasi role staff/admin/admin_cabang via `AdminLayout`. `BookingScanner` sendiri sudah menghormati `isAdminCabang` (hanya bisa proses booking cabangnya). Admin cabang tetap bisa pakai scanner untuk cabangnya.

### Detail Teknis
- File diubah: `BookingsManager.tsx`, `AdminSidebar.tsx`, `src/pages/Admin.tsx` (atau routing file) untuk redirect.
- Tidak ada perubahan database / RLS.
- Komponen `BookingScanner.tsx` tetap dipakai apa adanya — cukup di-mount di dalam `<Dialog>`.

---

## Bagian 2 — Rekomendasi Konsolidasi Menu Lain

Ditemukan beberapa menu yang fungsinya mirip dan layak digabung agar UX lebih bersih:

### 1. Keuangan Report ↔ Daftar Laporan > Keuangan (REDUNDAN)
- `Keuangan > Financial Report` dan `Daftar Laporan > Keuangan` keduanya menampilkan ringkasan finansial.
- **Rekomendasi:** Hapus `Keuangan > Financial Report`. Jadikan `Daftar Laporan > Keuangan` sebagai satu-satunya sumber laporan finansial. Link cepat dari Keuangan group bisa diarahkan ke laporan tersebut.

### 2. Keuangan > Payments ↔ Daftar Laporan > Pembayaran (REDUNDAN)
- Keduanya melist data pembayaran.
- **Rekomendasi:** Pertahankan `Keuangan > Payments` sebagai **operasional** (action: konfirmasi, refund). Pindahkan `Daftar Laporan > Pembayaran` jadi sub-tab di dalamnya (tab "Laporan"), atau sebaliknya. Pilih satu sebagai master.

### 3. Transaction History ↔ Daftar Laporan > Penjualan & Booking (TUMPANG TINDIH)
- `Transaction History` sebagian besar = histori booking + pembayaran.
- **Rekomendasi:** Hapus `Transaction History` dari menu utama, integrasikan sebagai **tab "Histori"** di dalam `Confirmation Bookings` (filter status = completed/cancelled).

### 4. Keuangan > Pembayaran Manual ↔ Keuangan > Payments
- "Pembayaran Manual" = subset dari Payments dengan status manual proof.
- **Rekomendasi:** Jadikan filter / tab di dalam `Keuangan > Payments` (tab: Semua | Manual Proof | Midtrans), bukan menu terpisah.

### Ringkasan struktur sidebar yang disarankan

```text
Dashboard
─────────────
Confirmation Bookings        ← + Scan QR + tab Histori
CRM
Kapasitas Slot
Keluhan Kendaraan
Customers & Vehicles
Pengaturan Cabang
Marketing ▾
Keuangan ▾
  ├─ Payments               ← gabung Manual Proof sebagai tab
  └─ (Financial Report dihapus, link → Daftar Laporan)
Daftar Laporan ▾            ← satu-satunya tempat laporan
```

Hasil: dari ~12 entri sidebar turun jadi ~9, tanpa kehilangan fungsi.

---

## Eksekusi
Bagian 1 (penggabungan scanner) bisa langsung dikerjakan sekarang. Bagian 2 (konsolidasi menu lain) menunggu konfirmasi mana yang ingin diterapkan — sebutkan nomornya (1/2/3/4) atau "semua" / "lewati".