# SPK Ban — jenis SPK kedua, alur sama dengan SPK Service

## Yang dibangun
- **Pilih jenis di awal**: jendela "Buat SPK Baru" menampilkan dua pilihan dulu: **SPK Service** atau **SPK Ban**. Setelah itu baru pilih Scan atau Isi Manual.
- **Alur sama**: SPK Ban memakai alur yang sama seperti SPK Service: status, persetujuan customer, mekanik, Final Check, timeline, auto-save, pratinjau/unduh PDF, bagikan, dan lacak via QR.
- **Form SPK Ban**: isiannya mengikuti template SPK Ban dari Anda. Data customer dan kendaraan tetap sama, lalu ada bagian khusus ban.
- **PDF SPK Ban**: tata letak cetak dibuat sesuai template kertas SPK Ban.
- **Daftar Semua SPK**: tiap SPK punya label "Service" atau "Ban", dan ada filter jenis SPK yang bisa dipakai bersama filter yang sudah ada.
- SPK lama otomatis dianggap **SPK Service**.

## Yang dibutuhkan dari Anda
Template SPK Ban belum bisa dilampirkan di chat ini. Pilih salah satu cara:
- Ketik daftar kolom/isian SPK Ban di chat. Contoh: posisi ban (FL/FR/RL/RR/serep), merk/ukuran, kode DOT, ketebalan alur, tekanan angin, jasa (balancing, spooring, tambal), catatan.
- Atau unggah gambar/PDF lewat tombol lampiran (ikon +/klip) di kotak chat Lovable.

Sampai template diterima, saya buat struktur jenis SPK lebih dulu: pilihan jenis, label, filter, dan alur. Untuk form Ban, saya mulai dari isian ban standar yang disebut di atas, lalu menyesuaikannya dengan template Anda.

## Detail teknis
- Tambah kolom `spk_type` (`service` | `ban`, default `service`) di `spk_orders`; SPK lama terisi otomatis sebagai `service`.
- Template form baru `spk_ban` di `spk_form_templates`/sections/fields; workflow `spk_default` dipakai bersama sehingga tidak ada duplikasi transisi.
- `SPKCreateModeDialog`: langkah pemilihan jenis, lalu jenis dibawa ke `/spk/new?type=ban`. `SPKNewForm`, `SPKService.create` dan canvas v2 membaca jenis untuk memilih template. Paket servis disembunyikan untuk SPK Ban dan diganti daftar jasa ban.
- `SPKPrint`/PDF: varian tata letak Ban.
- OCR scan memakai pemetaan isian Ban terpisah di `ocrPrefill`.
- `SPKAllList`: badge jenis dan filter chip Service/Ban.
