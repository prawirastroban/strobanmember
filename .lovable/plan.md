## Tujuan
Ganti `window.confirm(...)` pada tombol **Selesaikan SPK** di `FinishActionBar` (`src/pages/spk/SPKCanvas.tsx`) dengan pop-up review bergaya `AlertDialog` — konsisten dengan pop-up konfirmasi pembuatan SPK baru di `SPKNewForm.tsx`.

## Perubahan

### `src/pages/spk/SPKCanvas.tsx` — `FinishActionBar`
1. Tambahkan state `reviewOpen: boolean`.
2. Refactor `handleFinish` menjadi dua tahap:
   - **`openReview()`** — jalankan semua gate yang sudah ada (checklist final, tanda tangan mekanik, `runtime.validateAll()`, toast + auto-scroll error). Jika lolos, buka dialog (`setReviewOpen(true)`) alih-alih `window.confirm`.
   - **`confirmFinish()`** — berisi seluruh blok update Supabase (status `closed`, `nextData`, insert `spk_events`, `setSpkRow`, toast). Dipanggil dari tombol "Ya, Selesaikan" di dialog.
3. Tombol utama di bar memanggil `openReview` (bukan langsung update).
4. Tambahkan `<AlertDialog>` (import dari `@/components/ui/alert-dialog`) menampilkan ringkasan sebelum finalisasi:
   - **Header**: "Konfirmasi Selesaikan SPK" + subtitle nomor SPK (`spkRow?.spk_number`).
   - **Ringkasan Pengerjaan**:
     - Mekanik: `mechanic_name` (fallback ke email/role).
     - Waktu Mulai / Selesai (preview): `time_start` yang ada → jam sekarang; format `HH:mm`.
     - Estimasi durasi: dihitung dari `time_start` → `now` (`Xj Ym`).
   - **Checklist Final**: 4 poin (Inspeksi, Estimasi, Kebersihan, Ready) — tampilkan ikon check hijau karena sudah pasti tercentang saat sampai tahap ini.
   - **Catatan Mekanik**: preview `mechanic_note` (truncate ~200 char, "—" jika kosong).
   - **Tanda Tangan**: badge "Sudah dibubuhkan" (karena sudah divalidasi).
   - **Warning kecil**: "Status SPK akan berubah menjadi Selesai dan tidak bisa diedit lagi."
5. Footer dialog: `Batal` + tombol primary `Ya, Selesaikan SPK` (disabled saat `busy`, spinner saat proses). Setelah sukses dialog otomatis tertutup (`setReviewOpen(false)`).
6. Styling mengikuti tema liquid glass yang sudah dipakai di canvas (border `white/10`, `backdrop-blur`, aksen primer).

## Tidak termasuk
- Tidak mengubah logic validasi, workflow engine, autosave, atau signature pad.
- Tidak mengubah pop-up konfirmasi di `SPKNewForm.tsx`.
- Tidak menyentuh tombol "Fast-forward" (`QuickFinishSpk`) — di luar scope permintaan.
