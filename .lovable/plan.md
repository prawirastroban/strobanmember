# Scan SPK Ban langsung membuka form SPK Ban

## Masalah
Setelah scan pada jenis SPK Ban dan menekan "Gunakan Data Ini", aplikasi membuka form tanpa membawa jenis SPK. Karena itu form selalu kembali ke "Buat SPK Service", dan isian khusus ban tidak muncul.

## Yang diubah
- Setelah scan SPK Ban, aplikasi membuka **Buat SPK Ban**. Scan SPK Service tetap membuka **Buat SPK Service**.
- Data hasil scan juga menyimpan jenis SPK-nya. Jadi, kalau form dibuka dengan jenis yang berbeda, form tetap memakai jenis dari hasil scan.
- Sumber Data otomatis memilih **Walk-in**, karena pelanggan dan kendaraan diisi dari kertas.
- Isian SPK Ban yang terisi dari scan:
  - Nama, No HP, No Plat, Merk/Tipe/Tahun mobil.
  - Mekanik, yang diambil dari kolom Teknisi.
  - Data Ban, yaitu ukuran, merk, layanan, kondisi, mm, jumlah balancing/rotasi, ban bekas, riwayat, dan catatan.
- Di SPK Ban, Catatan dari kertas tidak dimasukkan ke Keluhan, Estimasi, atau Oli/Jasa.
- Di SPK Ban, tulisan ajakan scan diganti menjadi "Scan untuk mengisi data customer dan data ban", tidak lagi menyebut keluhan dan servis.

## Detail teknis
- `SpkScanPrefill` mendapat field opsional `spkType`. `composePrefill` mengisinya.
- `SPKScanDialog`: navigasi ke `/spk/new?type=${spkType}&source=scan`.
- `SPKNewForm`: saat memuat prefill, jika `p.spkType` berbeda dari `?type`, lakukan `navigate(?type=p.spkType&source=scan, {replace:true})` dan simpan ulang prefill sebelum mount ulang. Bisa juga dengan membaca jenis SPK dari prefill lebih dulu. Lalu `setSourceMode("walkin")`. Untuk Ban, lewati pengisian oli/jasa/estimasi.
