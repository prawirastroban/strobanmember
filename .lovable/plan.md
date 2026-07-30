## Temuan

- Sumber data kartu ada di `src/pages/spk/admin/SPKDomainDashboard.tsx` (satu-satunya komponen yang merender "Mechanic Load"/"Branch Load").
- Di database, join berhasil: `spk_orders.current_owner_user_id` → `profiles.full_name` (mis. "veren lingga", "Ganteng", "CS SELINA") dan `spk_orders.branch_id` → `branches.name` (mis. "Stroban Cirebon", "Stroban Jstation Tasikmalaya"). Jadi datanya ada dan tipe kolomnya cocok (uuid ↔ uuid).
- Kode saat ini sudah mencoba memetakan id → nama, tapi tampilan masih memperlihatkan potongan UUID. Penyebab paling mungkin: query lookup `profiles`/`branches` dari sisi klien gagal/kosong (kebijakan akses `profiles` hanya mengizinkan admin/staff/admin_cabang; kebijakan `branches` publik hanya untuk cabang `is_active = true`), sehingga peta nama kosong. Ini belum terkonfirmasi 100% — langkah pertama implementasi adalah memverifikasinya dari runtime.

## Rencana

1. **Verifikasi penyebab**: jalankan halaman `/dashboard/spk` dan cek hasil query lookup (error/rows kosong) untuk `profiles` dan `branches`, termasuk cabang non-aktif dan pemilik SPK yang bukan mekanik.
2. **Ambil nama lewat jalur yang pasti bisa dibaca**: sediakan satu fungsi database aman (SECURITY DEFINER, hanya mengembalikan id + nama, dibatasi untuk pengguna internal) yang mengembalikan nama mekanik dan nama cabang untuk daftar id yang diminta. Dashboard memanggil fungsi ini alih-alih menjoin dua tabel dari klien.
3. **Fallback yang manusiawi**: bila nama benar-benar tidak ditemukan, tampilkan teks "Mekanik tidak dikenal" / "Cabang tidak dikenal" — jangan pernah menampilkan potongan UUID.
4. **Tampilkan status memuat**: selama lookup berjalan, tampilkan placeholder singkat agar tidak sempat terlihat data mentah.
5. **Cek konsistensi**: pastikan halaman lain yang memakai id yang sama (daftar SPK, laporan/analytics) juga menampilkan nama, bukan UUID.

## Catatan teknis

- File utama: `src/pages/spk/admin/SPKDomainDashboard.tsx`.
- Perlu satu migrasi database untuk fungsi lookup nama (read-only, tanpa perubahan tabel/kolom).
- Tidak ada perubahan logika bisnis SPK, workflow, atau perhitungan KPI — hanya lapisan tampilan nama.
