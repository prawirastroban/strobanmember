# Audit: Penugasan Mekanik di SPK Digital

Hasil pemeriksaan kode saat ini:

- **Tidak ada input manual "dikerjakan oleh mekanik siapa" di mana pun.** `/spk/new` (`SPKNewForm.tsx`) tidak punya field mekanik sama sekali — hanya data pelanggan, kendaraan, keluhan, paket, dan persetujuan.
- Nama mekanik hanya terisi **otomatis**: di `SPKCanvas.tsx` saat akun ber-role `mekanik` pertama kali membuka Canvas (menulis `mechanic_user_id`, `mechanic_name`, `time_start`), dan di `WorkflowService.ts` sebagai fallback dari profil aktor transisi.
- `TimeTrackingCard.tsx` menampilkan baris "Mekanik" tapi **read-only** ("tidak dapat diedit manual").
- Akibatnya: SPK yang dibuka admin/staf lebih dulu, atau tidak pernah dibuka mekanik, tampil **"Belum ditugaskan"** di `SPKAllList` dan masuk grup tak dikenal di Mechanic Load pada dashboard.
- Ada juga field OCR `mechanic_name` (dari scan SPK fisik) yang saat ini masuk ke data tapi tak bisa dikoreksi lewat UI.

# Rencana Perbaikan

## 1. Hook daftar mekanik (baru)
`src/hooks/spk/useMechanics.ts`: ambil `user_roles` (role `mekanik`, termasuk normalisasi legacy `head_mekanik`) lalu gabung dengan `profiles` (`id, full_name, assigned_branch`). Filter opsional per cabang. Pola query sama seperti `UserRolesManager.tsx` yang sudah terbukti lolos RLS untuk staf internal.

## 2. Input di form pembuatan SPK (`/spk/new`)
Tambah blok **"Dikerjakan Oleh (Mekanik)"** pada `SPKNewForm.tsx`, di bagian Paket & Servis:
- Dropdown mekanik (difilter cabang terpilih bila ada), opsi "Belum ditentukan", plus opsi "Tulis manual" untuk nama mekanik yang belum punya akun (mis. hasil scan SPK fisik).
- Prefill otomatis dari hasil OCR `mechanic_name` bila cocok dengan salah satu nama mekanik.
- Simpan ke `data.mechanic_id` + `data.mechanic_name` (dan `mechanic_assigned_by` / `mechanic_assigned_at` untuk jejak), serta set `current_owner_user_id` ke mekanik terpilih saat SPK dipublish ke antrian.

## 3. Input di Canvas SPK
Ubah baris "Mekanik" pada `TimeTrackingCard.tsx` menjadi dapat diedit oleh admin/staff/admin cabang (mekanik hanya bisa mengisi kalau masih kosong):
- Tombol "Ubah" membuka dropdown mekanik yang sama.
- Menyimpan langsung ke `spk_orders.data` (merge non-destruktif, konsisten dengan autosave) dan memperbarui `spkRow` lokal.
- Auto-capture yang ada tetap jalan, tapi **hanya bila `mechanic_id`/`mechanic_name` masih kosong** — penugasan manual tidak akan tertimpa.

## 4. Konsistensi tampilan
- `loadNames.ts` sudah membaca `mechanic_id`; pastikan resolusi nama memakai urutan: `data.mechanic_name` → nama profil dari `data.mechanic_id` → `current_owner_user_id`.
- `SPKAllList.tsx` dan `SPKDomainDashboard.tsx` ikut sumber yang sama sehingga kartu "Mechanic Load" dan label mekanik di daftar SPK konsisten.
- `spkDisplayMap.ts` / PDF tetap membaca `mechanic_name`, jadi hasil cetak otomatis ikut terisi.

## Catatan teknis
- Tidak ada perubahan skema database: cukup memakai field JSON di `spk_orders.data` plus kolom `current_owner_user_id` yang sudah ada.
- Tidak ada perubahan alur workflow (Draft → Pengerjaan Mekanik → Selesai) maupun aturan approval.
