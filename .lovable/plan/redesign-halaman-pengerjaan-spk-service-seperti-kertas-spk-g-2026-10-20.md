# Redesign halaman pengerjaan SPK Service seperti kertas SPK (gambar) dengan gaya SPK_Stroban_1.html

Hanya tampilan SPK Service. Data, isian wajib, auto-save, status, approval dan SPK Ban tidak berubah. Setiap isian tetap bisa diisi langsung (interaktif) di tempatnya.

## Susunan baru (desktop: 2 kolom seperti kertas)

```text
| SALES ADVISOR (kiri)                 | MEKANIK / DIAGNOSTIC CHECK (kanan)      |
| Merk/Jenis Oli + Mileage Now / Next  | Engine/Brake/Fluid Check (tabel baris)  |
| Service Umum (centang 2 kolom,       |   Nama item | Good / Attention / Replace|
|   Ganti Oli L, Tune Up M P U)        | Service Lainnya (Lamps: Head Fog Side   |
| Others Service                       |   Rear Brake, Wiper, Battery, Alt.)     |
| Paket Petrol | Paket Diesel          | AC Checking                             |
| AC Package (Polar/Orca, S/M/L) Bonus | Suspension System                       |
| Catatan Customer + foto              | Part Replacement                        |
| Strip: Tgl Masuk/Keluar/Waktu M/K    | Final Check: 2 centang                  |
| Body Dent Check (foto)               |                                         |
| Tyres Check Left/Right (mm), Brand,  |                                         |
|   Pattern, Size, Ban Bekas           |                                         |
| Note by Mechanic                     |                                         |
| Strip: Waktu Mulai/Selesai/Jeda/Kembali + Catatan Jeda                         |
| Persetujuan: Technician · Sales Advisor · Customer                             |
```

- Tabel Customer/Kendaraan 3 kolom di atas tetap seperti sekarang.
- Judul kolom: "Sales Advisor" abu, "Mekanik/Diagnostic Check" gelap; judul sub-bagian strip abu/gelap kapital kecil (gaya card-head html).
- Setiap baris diagnosa: nama item di kiri, 3 tombol kecil Good / Attention / Replace di kanan (hijau / kuning / merah saat aktif, gaya check-ok html), catatan muncul saat bukan Good.
- Tab Safety Check / General Check Up / Estimasi diganti tampilan kertas tunggal; Estimasi tetap sebagai bagian di bawah.
- Font rapat 12.5px, angka (mm, km, jam) mono, garis tipis antar sel.
- HP: dua kolom menumpuk (Sales Advisor dulu, lalu Mekanik), tiap baris tetap 1 baris label + tombol.

## Technical
- Baru: `ServicePaperLayout` di `src/components/spk/canvas/` yang menyusun kartu yang sudah ada (ServiceOrderCard, ComplaintCard, TimeTrackingCard, TyreCheckCard/TyreCheckPanel, MechanicNotesCard, Inspection*, ACCheckCard, FinalizationCard) dalam grid `lg:grid-cols-2`; binding `useBinding` yang sama, tanpa field baru.
- `ConditionRow` diberi varian ringkas "Good/Attention/Replace" (nilai tersimpan tetap GOOD/OK/BAD).
- `SPKCanvas` cabang service memakai layout baru menggantikan `MechanicTabs`; section id `sec-*` tetap terdaftar untuk navigasi & validasi.
- Hanya token warna semantik di index.css. Verifikasi Playwright desktop 1380px + HP 390px pada SPK yang sedang dibuka.
