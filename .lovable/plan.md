## Tujuan
Menghilangkan seluruh form tanda tangan (admin, customer, mekanik) di alur SPK. Persetujuan cukup lewat tombol/checkbox konfirmasi, dengan pencatatan otomatis siapa dan kapan menyetujui.

## Perubahan per area

**1. Form SPK Baru (`/spk/new`)**
- Hapus dua kanvas tanda tangan Admin & Customer pada kartu "Persetujuan & Tanda Tangan".
- Ganti jadi kartu "Persetujuan" berisi: checkbox konfirmasi customer + tombol "Setujui & Buat SPK".
- Validasi submit tidak lagi mengecek tanda tangan, hanya centang persetujuan.
- Data yang disimpan: `approved_by_admin` (nama/ID admin login), `approved_admin_at`, `customer_approved`, `customer_approved_at` — menggantikan `signature_admin` / `signature_customer`.
- Blok review sebelum submit menampilkan status "Disetujui oleh …" alih-alih gambar tanda tangan.

**2. Canvas SPK (mekanik)**
- Hapus pad tanda tangan mekanik di kartu Finalisasi dan di ApprovalCard.
- Gate "Selesaikan SPK" berubah: cukup semua poin final checklist tercentang + tombol konfirmasi "Selesaikan & Setujui". Sistem mencatat `mechanic_approved_at` + identitas mekanik yang sudah otomatis terekam.
- Hapus banner/toast peringatan "Tanda tangan mekanik belum diisi".

**3. Halaman Persetujuan Customer (`/spk/:id/approve`)**
- Hapus pad tanda tangan; tombol jadi "Setujui SPK" (aktif setelah checkbox konfirmasi dicentang).
- Preview tanda tangan admin/mekanik diganti daftar "Disetujui oleh" + waktu.

**4. Cetak / PDF (`SPKPrint`) dan tracker publik**
- Blok tiga kotak tanda tangan diganti baris persetujuan: peran, nama, waktu persetujuan. Tata letak tetap simetris (3 kolom).

**5. Backend**
- Fungsi `customer_approve_spk` diubah agar parameter tanda tangan tidak wajib (menerima persetujuan tanpa signature) dan menyimpan waktu persetujuan.
- Gate di `WorkflowService` yang menolak penutupan SPK tanpa `signature_mekanik` diganti pengecekan persetujuan mekanik.

## Catatan teknis
- Kolom/field lama (`signature_admin`, `signature_customer`, `signature_mekanik`) tidak dihapus dari data lama agar SPK historis tetap bisa dibuka; hanya tidak ditampilkan/diminta lagi.
- Komponen `SignaturePad.tsx` dan `SignaturePadBound.tsx` tidak lagi dipakai di alur SPK dan akan dilepas dari semua import terkait.
- `spkDisplayMap.ts` menambahkan field metadata persetujuan yang dipakai oleh Canvas, halaman approve, PDF, dan tracker.
