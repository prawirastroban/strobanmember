
## Masalah yang ditemukan dari PDF `SPK/TASI5270/202607/0001`

1. **Waktu Pengerjaan kosong** (`Mulai —`, `Selesai —`, `Durasi —`, `Mekanik —`). Penyebab: `TimeTrackingCard.tsx` masih pakai konstanta hardcoded, dan `WorkflowService.transition()` cuma update kolom `status` — tidak pernah menulis `time_start`, `time_end`, `time_duration` ke `spk_orders.data`.
2. **Signature Mekanik kosong** di PDF walau slot-nya ada. Penyebab: tidak ada gate — SPK bisa ditransisikan ke `closed` tanpa `signature_mekanik` sudah terisi, jadi Section 11 sering di-skip dan tanda tangan tidak pernah dibubuhkan.
3. **Flow terlalu panjang** — mekanik harus lewat `in_progress → work_completed → qc_pending → closed` empat kali klik untuk menyelesaikan.

## Solusi (UI + minor runtime, tanpa mengubah schema DB)

### 1. Auto-timestamp di `WorkflowService.transition()`
Sebelum `update({ status })`, hitung patch untuk `data` JSONB berdasar transisi:

- `→ in_progress` : set `time_start = HH:mm`, `date_in = YYYY-MM-DD`, `time_in` (jika kosong).
- `→ work_completed` atau `→ qc_pending` : set `time_end_work` bila belum ada.
- `→ closed` : set `time_end`, `date_out`, hitung `time_duration` (menit dari `time_start`, format `Xh Ym`). Jika `mechanic_name` masih kosong, isi dari `profiles.full_name` milik `ctx.actor.user_id`.

Semua patch merge non-destruktif (`data: { ...existing, ...patch }`) dan hanya menulis field yang masih kosong sehingga edit manual tetap dihormati.

### 2. `TimeTrackingCard.tsx` jadi live view
Ganti array `ROWS` dengan pembacaan langsung dari runtime via `useBinding` (`time_start`, `time_end`, `time_duration`, `date_in`, `date_out`, `time_in`, `time_out`, `mechanic_name`). Tetap read-only. Empty state tetap `—` supaya kompatibel dengan SPK lama.

### 3. `spkDisplayMap.workTimes` diperluas
Tampilkan enam baris (`Tanggal Masuk / Keluar`, `Mulai`, `Selesai`, `Durasi`, `Mekanik`) di PDF & halaman customer, mengambil field yang sama seperti di atas.

### 4. Gate signature mekanik sebelum SPK bisa `closed`
Di `WorkflowService.transition()`, jika `to_status === "closed"` dan `data.signature_mekanik` kosong, tolak dengan pesan `Tanda tangan mekanik belum diisi` — Canvas sudah menampilkan pesan gagal via toast dan auto-scroll ke Section 11. Tambahkan juga red-dot indikator di `WorkflowPhaseStrip` bila signature belum ada.

### 5. Simplifikasi flow selesai (UX)
Tambah tombol utama **"Selesaikan SPK"** di action bar untuk role mekanik yang:
- Bila status `in_progress` / `work_completed` / `qc_pending`, buka modal Final Check + Signature (reuse `SignaturePadBound`).
- Setelah signature dibubuhkan, jalankan `runTransition` berurutan (`in_progress → work_completed → qc_pending → closed`) dalam satu klik.
- Menggantikan tiga tombol lanjutan yang membingungkan; tombol transisi individual tetap tersedia di menu "Lainnya" untuk kasus khusus.

### 6. Sinkronisasi ke print
Karena Print membaca `spk_orders.data` via `buildSpkDisplay`, semua perubahan di poin 1–3 otomatis muncul di PDF tanpa perubahan tambahan.

## File yang disentuh
- `src/services/spk/WorkflowService.ts` — auto-timestamp + gate signature.
- `src/components/spk/canvas/TimeTrackingCard.tsx` — bind ke runtime.
- `src/lib/spk/spkDisplayMap.ts` — perluas `workTimes`.
- `src/pages/spk/SPKCanvas.tsx` — tombol "Selesaikan SPK" satu-klik + signature modal.
- `src/hooks/spk/useSPKWorkflow.ts` — helper `finishSpk()` (rangkai transisi).

Setelah diterapkan, tes: mulai pengerjaan → Section 11 signature → klik "Selesaikan SPK" → PDF menampilkan `Mulai/Selesai/Durasi/Mekanik` dan tanda tangan mekanik terpampang.
