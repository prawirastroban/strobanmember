## Tujuan
Sebelum SPK benar-benar dibuat, admin melihat pop-up ringkasan seluruh isian untuk verifikasi. Setelah konfirmasi, SPK dibuat + auto-publish ke mekanik, lalu langsung diarahkan ke daftar SPK.

## Perubahan (single file: `src/pages/spk/SPKNewForm.tsx`)

**1. Pop-up konfirmasi review**
- Tambah state `reviewOpen` dan handler `handleReviewClick` yang:
  - Menjalankan validasi Zod + gate tanda tangan/persetujuan (persis logika sekarang di awal `handleSubmit`).
  - Jika valid → buka `AlertDialog` review, bukan langsung submit.
- Tombol **"Buat SPK"** di sticky bar memanggil `handleReviewClick` (bukan `handleSubmit` langsung).
- Isi dialog (ringkasan read-only, scrollable, semua sumber dari `form` + state paket & signature):
  - **Cabang & Prioritas**
  - **Customer**: nama, HP, platform
  - **Vehicle**: merk/tipe/tahun, plat, KM sekarang, KM servis berikutnya
  - **Complaint**: keluhan, estimasi biaya, waktu konfirmasi
  - **Paket & Servis**: merk/qty oli, chip service umum/tune-up/others/paket bensin/diesel/AC, bonus
  - **Tanda tangan**: preview thumbnail admin & customer + status "Customer menyetujui ✓"
- Footer dialog: **"Periksa Ulang"** (tutup dialog) & **"Konfirmasi & Buat SPK"** (memanggil `handleSubmit` sebenarnya, disable saat `submitting`).

**2. Redirect ke daftar SPK setelah sukses**
- Ganti `navigate(\`/spk/${result.data.id}\`, { replace: true })` (line 574) menjadi `navigate("/dashboard/spk/all", { replace: true })`.
- Toast sukses tetap muncul dengan nomor SPK sebagai referensi.

**3. Sinkronisasi Canvas — audit ringan**
Payload `initialData` di `handleSubmit` (line 491-518) sudah memuat semua key yang dibaca `useBinding` di Canvas (`customer_*`, `vehicle_*`, `complaint_*`, `service_*`, `signature_admin`, `signature_customer`). Tidak ada perubahan skema — cukup pastikan dialog review menampilkan **variable yang sama** yang dikirim ke `SPKService.create` supaya "yang dilihat = yang tersimpan = yang muncul di Canvas".

## Detail teknis
- Gunakan komponen shadcn `AlertDialog` (sudah dipakai di project).
- Refactor: pisahkan validasi menjadi helper `validateIntake()` yang mengembalikan `{ ok, data }`; dipanggil oleh `handleReviewClick`. `handleSubmit` (post-confirm) tetap re-parse untuk keamanan tapi tanpa toast redundan.
- Tidak menyentuh business logic workflow (`awaiting_customer_approval → in_progress`), hanya membungkusnya di balik konfirmasi + mengganti tujuan navigasi.
- Tidak ada perubahan DB / edge function.

## Verifikasi
- Klik "Buat SPK" dengan form kosong → toast error, dialog TIDAK terbuka.
- Klik dengan form lengkap → dialog review menampilkan semua nilai; "Periksa Ulang" menutup dialog tanpa efek samping.
- Konfirmasi → SPK terbuat, status pindah ke `in_progress`, halaman navigate ke `/dashboard/spk/all`, kartu baru tampil dengan data yang sama.
- Buka SPK dari daftar → Canvas menampilkan customer/vehicle/complaint/paket/signature yang sama.
