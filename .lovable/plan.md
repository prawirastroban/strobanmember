
# SPK ⇄ Booking ⇄ Customer Integration + AI Health

Menyatukan pembuatan SPK dengan data booking, pelanggan, dan kendaraan yang sudah ada. Menghapus placeholder "Phase 5.3" dan menjadikan SPK bagian alami dari alur booking check-in → dikerjakan. Menambah view/approval SPK di sisi customer, riwayat SPK yang bisa dilihat & diunduh, serta analisis AI kesehatan mobil.

## 1. SPK Baru — Sumber Data Cerdas (`/spk/new`)

Ganti header "Phase 5.3" menjadi ringkasan konteks (nama pelanggan / booking terpilih).

Tambah **selector sumber data** di paling atas form dengan 3 mode tab:

- **Dari Booking Check-In** (default) — daftar booking berstatus `checked_in` / `in_progress` yang belum punya SPK. Pilih satu → auto-fill semua field (cabang, pelanggan, kendaraan, keluhan, kilometer) dari `bookings` + `vehicles` snapshot. Field ter-lock dengan tombol "Edit" per bagian.
- **Pelanggan Terdaftar** — search combobox `profiles` (nama / HP / member ID). Setelah pilih pelanggan, muncul dropdown kendaraan miliknya dari `vehicles`. Pilih → auto-fill.
- **Walk-in Baru** — form manual seperti sekarang.

Simpan `booking_id` (nullable) dan `vehicle_id` di `spk_orders` untuk relasi balik.

## 2. Otomatisasi dari Booking → SPK Queue

Alur baru di `BookingsManager` saat admin/staff menekan **"Mulai Dikerjakan"** pada booking `checked_in`:

1. Update `bookings.status = 'in_progress'` (sudah ada).
2. Auto-create draft `spk_orders` jika belum ada untuk booking tsb (via service, bukan trigger — agar RLS jelas), pakai data booking + vehicle snapshot.
3. SPK muncul otomatis di **SPK Work Queue**.
4. Toast dengan CTA "Buka SPK" langsung ke Canvas.

Booking `checked_in` yang belum "Mulai Dikerjakan" tidak masuk queue — konsisten dengan permintaan.

## 3. Customer-Side SPK View & Approval

Di `MyBooking.tsx` (halaman detail booking pelanggan):

- Tambah section **"Surat Perintah Kerja"** yang muncul ketika `booking.status ∈ {in_progress, finishing, completed}` dan SPK terkait ada.
- Menampilkan: nomor SPK, status workflow saat ini, timeline ringkas, daftar temuan inspeksi & item pekerjaan, foto (read-only), estimasi biaya.
- **Approval customer**: kartu tanda-tangan digital + tombol "Setujui Pengerjaan" / "Minta Diskusi" saat workflow di stage yang membutuhkan approval customer (mapping via `approval_matrix` Owner Config yang sudah ada — tambah role `customer` sebagai approver opsional di ApprovalCard).
- Persetujuan customer menulis ke `spk_approvals` dan menembakkan transisi workflow via `useSPKWorkflow` yang sudah ada.

## 4. Riwayat SPK — Lihat & Unduh

- Di `HistoryPerawatan.tsx` (customer) dan admin SPK list: tiap baris riwayat menampilkan link "Lihat SPK" bila `spk_id` ada.
- **Halaman print** baru `src/pages/spk/SPKPrint.tsx` di route `/spk/:id/print` — layout satu halaman A4 mirror form fisik Stroban (header cabang, data pelanggan/kendaraan, checklist inspeksi, catatan mekanik, tanda tangan, biaya, timeline). Read-only, dirender dari runtime schema.
- Tombol **"Download PDF"** menggunakan `window.print()` + `@media print` styling (tanpa dependency baru). Tersedia dari SPKCanvas, SPKDetail, dan Customer MyBooking.
- Tombol "Kirim ke WhatsApp" (opsional, memakai deep link `wa.me` dengan URL SPKPrint).

## 5. AI Analisis Kesehatan Mobil

Setelah SPK di stage `completed` (atau saat mekanik selesai isi inspeksi):

- Edge Function baru `spk-health-analysis` memanggil Lovable AI Gateway dengan payload: hasil inspeksi (suspension/tyre/AC/engine), kilometer, riwayat servis kendaraan.
- Output JSON terstruktur: `overall_status` (Excellent/Good/Needs Attention/Critical), `score` 0-100, `findings[]`, `recommendations[]`, `next_service_km`.
- Disimpan di kolom baru `spk_orders.ai_health_report jsonb`.
- Ditampilkan sebagai kartu **"Analisis Kesehatan Kendaraan"** di:
  - SPK Canvas (mekanik/admin bisa regenerate)
  - Customer MyBooking & History (read-only, dengan badge warna)
  - Halaman SPKPrint (ikut ter-download)
- Reuse `computeVehicleHealth` yang ada sebagai fallback deterministik bila AI gagal.

## 6. Database Changes

Migration tunggal:

- `ALTER TABLE spk_orders ADD COLUMN booking_id uuid REFERENCES bookings(id)`, `ADD COLUMN vehicle_id uuid REFERENCES vehicles(id)`, `ADD COLUMN ai_health_report jsonb`.
- Index pada `booking_id`.
- Update RLS: customer boleh SELECT SPK yang `booking_id` miliknya, dan INSERT ke `spk_approvals` untuk SPK tsb saat role approver = customer.
- `approval_matrix` default OCL: tambah slot `customer_approval` (opsional, default off — Owner bisa nyalakan di Configuration Console).

## 7. Technical Notes

- Semua UI reuse komponen yang ada (shadcn cards, CanvasSection, ApprovalCard, WorkflowActionBar).
- Auto-create SPK di step 2 dilakukan di layer service (`SPKService.createFromBooking(bookingId)`), dipanggil `BookingsManager` — tanpa DB trigger agar tetap terlihat di kode.
- Print page memakai runtime schema yang sudah ada; tidak menduplikasi definisi field.
- AI call dilakukan di edge function (server) — key tersimpan di env, tidak di client.
- Tidak ada engine baru: Workflow, Automation, Runtime, RoleProfiles, OCL semua dipakai apa adanya.

## Files (rencana sentuh)

```text
supabase/migrations/*_spk_booking_link.sql       (baru)
supabase/functions/spk-health-analysis/index.ts  (baru)
src/services/spk/SPKService.ts                   (createFromBooking, linkVehicle)
src/pages/spk/SPKNewForm.tsx                     (3-mode source picker, hapus "Phase 5.3")
src/pages/spk/SPKPrint.tsx                       (baru — printable)
src/pages/spk/SPKCanvas.tsx                      (tombol Print + AI Health card)
src/pages/MyBooking.tsx                          (section SPK + approval customer)
src/pages/HistoryPerawatan.tsx                   (link ke SPKPrint)
src/components/admin/BookingsManager.tsx         (auto-create SPK on Mulai Dikerjakan)
src/components/spk/canvas/ApprovalCard.tsx       (support customer approver)
src/components/spk/AIHealthCard.tsx              (baru)
src/App.tsx                                      (route /spk/:id/print)
```

## Konfirmasi Cepat

1. Auto-create SPK saat "Mulai Dikerjakan" — apakah **selalu** atau hanya jika admin klik "Buat SPK dari booking"? (Saya default: selalu, biar konsisten dengan permintaan Anda.)
2. Approval customer — **wajib** sebelum invoice, atau opsional (bisa dilewati staff)? (Default: opsional, di-toggle di OCL.)
3. AI analisis — jalan **otomatis saat SPK completed**, atau on-demand via tombol? (Default: otomatis + tombol regenerate.)

Jika ketiganya OK, saya lanjut sesuai default di atas.
