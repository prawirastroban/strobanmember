# Perbaikan Pilihan Cabang di Buat SPK

## Penyebab (dari kode)
- Untuk Admin Cabang/Mekanik, form mengisi cabang dengan **nama/slug** cabang (mis. "bandung"), padahal form butuh **ID cabang**. Akibatnya dropdown terkunci tapi kosong, dan SPK gagal dibuat dengan pesan "Pilih cabang".
- Daftar cabang menampilkan semua cabang (termasuk nonaktif) untuk semua role.

## Perubahan
1. Cocokkan cabang yang ditugaskan (slug atau nama) ke data cabang, lalu isi form dengan ID cabang yang benar.
2. Admin Cabang (dan Mekanik): daftar hanya berisi cabangnya sendiri, otomatis terpilih dan terkunci.
3. Owner/CS Pusat: bisa memilih semua cabang aktif secara bebas.
4. Hasil scan tidak menimpa cabang yang terkunci; untuk role lain hasil scan tetap mencoba mencocokkan cabang.
5. Jika cabang yang ditugaskan tidak ditemukan, tampilkan pesan jelas agar menghubungi Owner, bukan dropdown kosong.
6. Tetap pertahankan pelepasan kunci sentuh setelah Scan di HP.

## Uji
- Login sebagai Admin Cabang: cabang terisi otomatis, hanya satu pilihan, SPK bisa dibuat sampai selesai.
- Owner: dropdown bisa dibuka dan dipilih (desktop dan HP 390px, setelah Scan).

## Detail teknis
- File: `src/pages/spk/SPKNewForm.tsx` (efek preselect baris ~500, `branchLocked` ~956, query cabang ~464 tambah `is_active=true`, efek scan ~580).
- Resolusi: `branches.find(b => norm(b.slug)===norm(userBranch) || norm(b.name)===norm(userBranch))` → `branch_id = match.id`; saat locked, `branches` difilter ke `[match]`.
