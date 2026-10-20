# Preview & Cetak SPK Service mengikuti SPK_Stroban_1-3.html

Hanya tampilan yang berubah. Data, alur persetujuan, tombol Bagikan/Unduh, dan SPK Ban tidak berubah. Pratinjau di dialog dan PDF unduhan memakai tampilan yang sama (PDF diambil langsung dari tampilan pratinjau).

## Susunan baru (sesuai HTML)

```text
STROBAN / First Class Service            SERVICE REPORT
Surat Perintah Kerja · Cabang · Versi    SPK/... (mono) · tanggal · [CLOSED]
==================== garis merah 3px ====================
[Customer | Brand | Waktu Estimasi ]
[Plat     | Type  | Waktu Konfirmasi]   (tabel 3x3)
[Phone    | Years |                 ]
+-------- SALES ADVISOR --------+---- MEKANIK / DIAGNOSTIC ----+
| Oli + strip Mileage/Next/Qty  | Legenda G / ! / R / —        |
| Service Umum (centang 2 kol)  | Engine/Brake/Fluid           |
| Others Service                | Service Lainnya              |
| Paket Petrol/Diesel + Bonus   | AC Checking                  |
| AC Package                    | Suspension System            |
| Catatan Customer              | Part Replacement             |
| Tanggal & Waktu (strip 4 kol) | Final Check (SA / Mekanik)   |
| Body Dent Check (kiri/kanan)  |                              |
| Tyres Check + tebal 4 ban     |                              |
| Note by Mechanic              |                              |
+-------------------------------+------------------------------+
Analisis Kesehatan Kendaraan (AI)
[Technician DISETUJUI] [Sales Advisor DISETUJUI] [Customer DISETUJUI]
Foto (jika ada)
```

- Warna: merah #E53935 untuk judul kartu, kotak status hijau G / kuning ! / merah R / abu —.
- Tombol paket aktif merah, tidak aktif abu; checkbox centang merah.
- Font Inter + JetBrains Mono untuk nomor/angka.
- HP: dua kolom turun jadi satu kolom; PDF tetap 2 kolom A4, kartu tidak terpotong antar halaman.

## Detail teknis
- Tulis ulang bagian render SPK Service di `src/pages/spk/SPKPrint.tsx` (header, tabel customer, split Sales Advisor/Mekanik, diag-table, strip waktu, approval) memakai data yang sudah ada (`spkDisplayMap`, estimasi, approval, foto). Logika fetch, timeout/coba lagi, dan ekspor html2canvas + jsPDF tetap.
- Gaya disimpan sebagai CSS scoped di `PRINT_CSS` (dokumen kertas selalu terang, tidak ikut dark mode) agar PDF konsisten.
- `BanPrintSheet` tidak disentuh.
- Verifikasi Playwright: pratinjau desktop & 390px, lalu unduh PDF dan cek halaman.
