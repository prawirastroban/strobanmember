
## Tujuan
Di halaman Persetujuan SPK (`/spk/:id/approve`), user juga bisa melihat isi lengkap SPK yang sudah diisi admin & mekanik dan mengunduhnya dalam format PDF yang sama dengan template SPK yang sudah ada (`src/pages/spk/SPKPrint.tsx`).

## Perubahan (UI only — tanpa perubahan RLS / workflow)

### 1. `src/pages/spk/SPKCustomerApprove.tsx`
Tambahkan section baru **"Detail Lengkap SPK"** di antara card *Ringkasan Pekerjaan* dan *AI Health*, berisi ringkasan hasil pengerjaan mekanik yang selama ini hanya ada di PDF (Engine check, Tyre, AC, Suspension & Brake, Catatan Mekanik, Waktu Pengerjaan, Mekanik). Layout compact (mobile-first grid label/value) — pakai key yang sama seperti di `SPKPrint.tsx` (`d.engine_air_filter`, `d.tyre_fl_status`, `d.ac_freon`, `d.mechanic_note`, dll) supaya konsisten.

Tambahkan dua tombol aksi sekunder di dekat header card:
- **"Lihat Format SPK"** → `navigate('/spk/${id}/print')` (halaman print yang sudah ada, layout PDF penuh).
- **"Unduh PDF"** → panggil ulang logic `html2canvas + jsPDF` dari `SPKPrint.tsx` terhadap sebuah node tersembunyi (atau redirect ke `/spk/${id}/print` yang otomatis siap Unduh). Rekomendasi: pakai `navigate` ke halaman print (reuse penuh, tidak duplikasi kode PDF).

Tampilkan tanda tangan yang sudah ada (Admin & Mekanik QC) sebagai preview kecil di bagian bawah card detail — supaya user tahu SPK sudah ditandatangani pihak bengkel.

### 2. Tidak ada perubahan lain
- `SPKPrint.tsx` tidak diubah (sudah menghasilkan PDF sesuai template).
- Route `/spk/:id/print` sudah tersedia — akses customer sudah bekerja lewat RLS existing (customer bisa baca SPK miliknya).
- Tidak menyentuh workflow, RPC, RLS, atau autosave.

## Verifikasi
1. Buka `/spk/:id/approve` sebagai customer pemilik SPK → card *Detail Lengkap SPK* menampilkan isi hasil pengecekan mekanik.
2. Klik **Lihat Format SPK** → mengarah ke `/spk/:id/print` dengan layout PDF penuh.
3. Klik **Unduh PDF** (di halaman print) → file `SPK-<no>.pdf` terunduh.
4. Tombol *Approve & Tanda Tangan* dan *Perlu Revisi* tetap berfungsi seperti sebelumnya.
