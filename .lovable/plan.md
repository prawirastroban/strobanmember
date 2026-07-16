# Rencana: Modul Training SPK (PDF Statis)

Menghasilkan satu file PDF panduan lengkap fitur SPK yang dapat dibagikan ke admin & mekanik. Gaya **Hybrid SOP + visual**: struktur bab bernomor, callout tips/warning, diagram alur, tanpa perubahan pada aplikasi.

## Deliverable
- `/mnt/documents/Panduan-SPK-Stroban-v1.pdf` (siap unduh via `<presentation-artifact>`)

## Struktur Isi (±20–25 halaman A4)

**Cover** — Judul "Panduan Digital SPK — Stroban Service", versi, tanggal, brand strip merah #ff2b2b.

**Bab 1 — Pengenalan SPK**
- Apa itu SPK Digital, siapa penggunanya (Admin Cabang, Mekanik, Customer)
- Perbedaan dengan SPK kertas
- Peta menu di aplikasi (SPK / Work Order → New, Queue, Reports, Analytics)

**Bab 2 — Alur SPK & Peran** (diagram alur)
```text
Booking Check-in ─┐
                  ├─► Draft (Admin) ─► Persetujuan Customer
Walk-in ──────────┘        │                   │
                           ▼                   ▼
                   [ttd Admin]         [ttd Customer / Revisi]
                                               │
                                               ▼
                                    Pengerjaan Mekanik
                                     (diagnostic + ttd)
                                               │
                                               ▼
                                     Final Check Mekanik
                                               │
                                               ▼
                                            Selesai
```
Tabel role × aksi (siapa boleh apa di tiap fase).

**Bab 3 — Panduan Admin**
1. Membuka `/spk` & memahami Work Queue
2. Membuat SPK baru: sumber Booking (check-in) vs Walk-in
3. Mengisi data pelanggan & kendaraan
4. Section 1–4: Sales Order, keluhan, estimasi, tanda tangan admin
5. Mengirim ke Persetujuan Customer (in-app ping vs Salin Link)
6. Menangani revisi customer
7. Edit / hapus SPK

**Bab 4 — Panduan Mekanik**
1. Membuka SPK yang sudah di-approve customer
2. Diagnostic OK / NOT / N/A (tips: satu tap = terpilih, hindari double-tap)
3. Tombol **Lanjut** per section (tanpa wajib catatan)
4. Time tracking otomatis: Mulai / Selesai / Durasi
5. Tanda tangan mekanik + Final Check
6. Menutup SPK ke status Selesai

**Bab 5 — Customer, PDF & FAQ**
- Cara customer approve via ikon mobil (badge merah) di app
- Kirim Ulang Notifikasi (cooldown 60 dtk)
- Cetak/Unduh PDF SPK dari halaman detail
- Membaca Timeline & AI Health Analysis
- FAQ / Troubleshooting: SPK tidak muncul di queue, signature hilang, revisi customer, notifikasi tidak sampai

**Lampiran**
- Glosarium istilah (SPK, OCL, Final Check, dsb.)
- Kontak support: WA +628973700800

## Elemen Visual
- Brand strip merah 6px tiap halaman
- Ikon Lucide-style (disederhanakan) untuk callout: 💡 Tips, ⚠ Warning, ✅ Do, ✕ Don't
- Diagram alur ASCII-clean dirender via ReportLab shapes
- Tabel peran diberi shading `#FFECEC` header
- Font Unicode (DejaVu Sans) agar aksen Bahasa Indonesia benar
- Nomor halaman & footer "Panduan Digital SPK — Stroban Service"

## Teknik
- Python + `reportlab` (Platypus: SimpleDocTemplate, Paragraph, Table, Flowables)
- Registrasi DejaVu Sans + Bold via fontconfig
- Halaman A4, margin 1.5cm
- QA: convert PDF → JPG via `pdftoppm -r 150`, inspect tiap halaman, perbaiki overflow/overlap, ulangi sampai bersih
- Simpan final ke `/mnt/documents/Panduan-SPK-Stroban-v1.pdf`

## Yang TIDAK dilakukan
- Tidak menambah route/menu di aplikasi
- Tidak mengubah kode SPK atau schema DB
- Tidak menyertakan screenshot asli (tidak ada akses runtime); pakai wireframe/mock skematis bila perlu

Setelah PDF selesai & lulus QA, saya kirim tag `<presentation-artifact>` supaya bisa langsung diunduh.
