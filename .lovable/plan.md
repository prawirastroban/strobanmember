## Masalah

Saat ini fitur **Scan SPK** hanya bisa dipakai dari dialog "Buat SPK Baru" sebelum masuk form: hasil scan disimpan sementara lalu dibuka di `/spk/new`. Begitu admin pindah ke tab **Pelanggan** dan memilih akun yang sudah ada, form di-reset (`resetPrefill`) sehingga isian hasil scan hilang, dan tidak ada tombol untuk scan ulang dari dalam form.

## Yang akan dibuat

**1. Tombol "Scan SPK Kertas" di dalam `/spk/new`**
- Tombol muncul di kartu **Sumber Data**, berlaku untuk semua tab (Booking, Pelanggan, Walk-in).
- Menekan tombol membuka dialog scan yang sama (kamera/galeri → OCR → pratinjau hasil), tapi hasilnya langsung dipakai di form yang sedang terbuka — tanpa pindah halaman dan tanpa kehilangan pelanggan/kendaraan yang sudah dipilih.

**2. Aturan penggabungan data (anti-timpa)**
- Jika pelanggan/kendaraan sudah dipilih dari akun: nama, nomor WA, merk, tipe, tahun, dan plat **tetap memakai data akun** — hasil scan tidak menimpanya.
- Yang selalu diambil dari scan: keluhan, kilometer (kalau kosong), paket/servis, estimasi, catatan & checklist mekanik, serta foto SPK asli.
- Kalau tab Walk-in / belum ada pelanggan terpilih: perilaku tetap seperti sekarang (semua field terisi dari scan).
- Banner kuning "Data dari hasil scan SPK kertas" tetap tampil, plus keterangan bila sebagian field sengaja tidak ditimpa karena diambil dari akun pelanggan.

**3. Ganti tab tidak menghapus hasil scan**
- `resetPrefill` hanya mengosongkan pilihan sumber + data identitas, tapi checklist/catatan mekanik hasil scan (`scanExtraData`, foto asli) dipertahankan.
- Ada tombol kecil "Hapus data scan" bila admin memang ingin membuangnya.

## Catatan teknis

- `SPKScanDialog` diberi mode opsional `onResult(prefill)`: bila diisi, dialog mengembalikan hasil ke pemanggil, bukan `saveScanPrefill()` + `navigate("/spk/new?source=scan")`. Alur lama dari `SPKCreateModeDialog` tidak berubah.
- Logika merge ditaruh di satu helper di `SPKNewForm.tsx` yang dipakai baik oleh prefill sessionStorage (saat masuk halaman) maupun scan inline, dengan flag "jangan timpa identitas" saat `selectedCustomerId`/`selectedVehicleId` terisi.
- Tidak ada perubahan database, edge function, atau alur pembuatan SPK.

File yang disentuh: `src/components/spk/create/SPKScanDialog.tsx`, `src/pages/spk/SPKNewForm.tsx` (opsional `src/lib/spk/ocrPrefill.ts` untuk tipe hasil).
