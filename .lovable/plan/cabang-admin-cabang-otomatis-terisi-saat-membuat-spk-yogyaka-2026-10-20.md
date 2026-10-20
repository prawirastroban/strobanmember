# Cabang Admin Cabang Otomatis Terisi Saat Membuat SPK (Yogyakarta)

## Temuan
- Data akun benar: 3 Admin Cabang Yogyakarta (Stroban Jogja, hera purwaningsih, Daniel) punya cabang `yogyakarta`, dan cabang "Stroban Yogyakarta" aktif. Jadi masalah bukan di data.
- Perbaikan pilihan cabang kemarin baru ada di versi web terbaru. Kalau Admin Yogyakarta memakai aplikasi Android lama atau web yang belum di-publish, mereka masih memakai versi lama yang mengisi cabang dengan nama, sehingga SPK ditolak "Pilih cabang".
- Di versi baru masih ada celah: cabang hanya diisi oleh efek latar belakang. Bila tombol "Buat SPK" ditekan sebelum peran/cabang selesai dimuat, atau setelah form direset/diisi dari booking/scan, cabang bisa kosong sesaat dan validasi gagal.

## Perubahan
1. Saat menekan Buat SPK (dan saat membuka pop-up Periksa data), untuk Admin Cabang/Mekanik cabang selalu dipaksa memakai cabang akun — bukan bergantung pada isi form.
2. Isi dari booking, scan, dan reset form tidak boleh mengosongkan atau mengganti cabang yang terkunci.
3. Tombol Buat SPK menunggu sampai peran dan daftar cabang selesai dimuat (tampil "Memuat cabang…"), agar tidak muncul error "Pilih cabang".
4. Pesan jelas bila cabang akun tidak ditemukan tetap dipertahankan.

## Uji
- Masuk sebagai Admin Cabang Yogyakarta di preview: buka Buat SPK Service dan SPK Ban, cabang otomatis "Stroban Yogyakarta" dan terkunci, SPK berhasil dibuat sampai selesai (termasuk lewat isi dari booking).
- Owner tetap bisa memilih cabang bebas.

## Setelah selesai
- Perlu Publish agar web ikut berubah, dan AAB baru agar aplikasi Android Admin Yogyakarta ikut berubah.

## Detail teknis
- File: `src/pages/spk/SPKNewForm.tsx` — di handler submit/review: `if (scopedToBranch && lockedBranchId) v.branch_id = lockedBranchId` sebelum zod parse; `applyBookingToForm`, efek scan (~602) dan reset (~754) dilewati untuk `branch_id` saat `branchLocked`; disable submit saat `roleLoading || loadingBranches`.
