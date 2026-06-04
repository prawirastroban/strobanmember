## Rapikan Dialog "Rincian Booking" (Admin)

Pada dialog rincian booking di `src/components/admin/BookingsManager.tsx`, baris **"Tipe"** menampilkan raw service IDs (UUID gabungan) yang tidak relevan untuk admin. Hapus baris itu dan poles sedikit tampilan agar lebih rapi.

### Perubahan (file: `src/components/admin/BookingsManager.tsx`)

1. **Hapus baris "Tipe"** di section "Layanan & Pembayaran" (line 1431):
   - Hilangkan `<Row label="Tipe" value={b.service_type || "—"} />`.

2. **Rapikan format value** agar lebih mudah dibaca:
   - **Status Bayar**: bungkus pakai `<span className="capitalize">` supaya `paid` jadi "Paid", dll. (atau map ke label ID: Lunas / Belum Lunas / Menunggu).
   - **Metode**: capitalize juga (`cash` → "Cash", `transfer` → "Transfer", `qris` → "QRIS").
   - **Lokasi Servis**: map `workshop` → "Di Bengkel", `pickup` → "Pickup".
   - **Status Pickup**: capitalize.

3. **Polish layout kecil**:
   - Naikkan jarak antar section: ubah grid gap `gap-3` → `gap-3 sm:gap-4`.
   - Ubah `Row` agar label tidak terlalu sempit di mobile: `grid-cols-3` → `grid-cols-[110px_1fr]` supaya rapi & konsisten.
   - Tambah `space-y-0.5` di dalam tiap Section agar baris tidak terlalu rapat dengan border.
   - Pastikan Section "Catatan Pelanggan" & "Alasan Pembatalan" full-width (span 2 kolom) — tambah `sm:col-span-2`.

### Tidak diubah
- Logic data / query / permission.
- Card list & MobileBookingRow.
- DB / RLS / edge function.
