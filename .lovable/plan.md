Ubah baris ringkasan tiap kartu SPK di halaman `/dashboard/spk/all` (file `src/pages/spk/admin/SPKAllList.tsx`) agar menampilkan **Cabang · No. Polisi · Tanggal Service**, menggantikan nomor SPK + timestamp created_at.

## Perubahan

1. **Query** (`useEffect` di baris 49-54): tambahkan kolom `data` pada `select` sehingga snapshot booking bisa dibaca.
2. **Tipe `Row`**: tambahkan `data: any | null`.
3. **Render kartu** (baris 140-143): ganti dua `<p>`:
   - Baris 1 (font-semibold): `{data.booking_branch ?? "—"} · {data.vehicle_plate ?? "—"}`
   - Baris 2 (text-xs muted): `Tanggal service: {formatTanggal(data.booking_date)}` — format `dd MMM yyyy` id-ID; fallback ke `created_at` jika `booking_date` kosong.
4. **Nomor SPK** tetap tersedia sebagai tooltip `title` pada kartu supaya masih bisa ditelusuri, dan tetap dipakai di dialog hapus.
5. Field `spk_number` tetap ikut di-filter oleh search input (tidak diubah).

Tidak ada perubahan skema DB, RLS, atau route.

## Catatan teknis

`data.booking_branch`, `data.vehicle_plate`, `data.booking_date` sudah diisi oleh `SPKService.create()` saat SPK dibuat (baik dari booking maupun walk-in), jadi tersedia untuk semua SPK aktif.
