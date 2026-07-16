# Unify SPK Canvas — Hapus Pembagian Section

Tujuan: Halaman `/spk/:id` menjadi satu dokumen mengalir tanpa penanda "Section 1/2/3…", tanpa strip status workflow, dan tanpa badge "Draft" di header — sesuai 3 elemen yang Anda pilih. Semua data & runtime binding tetap utuh; hanya presentasi yang berubah.

## Perubahan

### A. `src/pages/spk/SPKCanvas.tsx` — bersihkan header & navigasi
1. Hapus render `<nav aria-label="SPK sections">` (chips 1–11) — baris 325–359.
2. Hapus render `<WorkflowPhaseStrip …>` (Draft → … → Selesai) — baris 322–323. Definisi fungsi `WorkflowPhaseStrip` + `WORKFLOW_PHASES` dihapus juga karena tidak dipakai lagi.
3. Hapus `<Badge>{meta.status}</Badge>` di header (baris 307–309).
4. Ubah baris subtitle header agar tidak lagi menyebut "Section X. Label"; ganti jadi ringkas: `{meta.branch} · {meta.date} · <b>{completed}/{total}</b> item selesai` (mempertahankan progress bar tipis di bawahnya, karena itu bukan bagian yang dipilih user).
5. Hapus banner "Lanjutkan dari terakhir" (`resumeSection` block, baris 363–393) — resume mengandalkan penanda section, sudah tidak relevan.
6. Hapus juga blok "Warna Tugas" legend (baris 408–423) karena legend itu memetakan warna per section role — tanpa section jadi tidak relevan. (Jika Anda ingin dipertahankan, sebut saja, saya biarkan.)
7. Bersihkan import yang tak dipakai lagi (`ArrowRight`, `X`, `RefreshCw`, `Badge`, ikon terkait).

### B. `src/components/spk/canvas/CanvasSection.tsx` — hilangkan tampilan "section"
Tetap dipertahankan sebagai wrapper karena banyak card memakainya, tapi presentasinya jadi netral (satu kesatuan dokumen):
- Hapus nomor bulat `{index}` di header.
- Hapus rail tint kiri (`before:*` + `roleTint`) — dokumen jadi flat.
- Hapus tombol collapse & chevron; card selalu terbuka (perilaku sama seperti `forceOpen`).
- Hapus pill status ("Selesai / Berjalan / Menunggu") di header — indikator per-section tidak lagi ditampilkan.
- Header jadi judul sederhana (`h2` tebal + subtitle kecil), tanpa role tint, tanpa index.
- Signature `CanvasSection` (props `index`, `role`, `forceOpen`, `required`) **tetap** agar call sites tidak berubah; prop diterima tapi tidak dirender secara visual. Ini menjaga risiko regresi rendah.
- `SectionScopeCtx` untuk runtime binding tetap dipasang seperti sekarang — role visibility (`useSectionBinding`) tetap berjalan supaya Runtime tetap menentukan siapa yang boleh isi/lihat.

### C. `SPKUXProvider` (context) — tetap dipakai
`SPKUXProvider` masih menghitung `completedCount / totalCount` yang dipakai progress bar & subtitle. Karena chip nav & resume banner sudah hilang, konsumen `currentSectionId`, `resumeSectionId`, `jumpTo` di `SPKCanvas.tsx` juga hilang — tapi provider itu sendiri tidak diubah. Bisa dibersihkan di pass berikutnya.

### D. Konsistensi flow (yang tidak berubah)
- FinishActionBar tetap satu tombol "Selesaikan SPK" (tanpa QC/approval gating) — sudah sesuai revisi sebelumnya.
- Runtime binding, autosave, workflow engine, PDF, timeline, notifikasi customer: **tidak disentuh**.
- `MechanicTabs` (Safety / General / Estimasi) tetap sebagai tab dalam satu card — user sebelumnya sudah setuju layout ini; ini bukan "section" bernomor, jadi tetap.
- `FinalizationCard` (gabungan catatan/waktu/approval) tetap sebagai satu form.

## Hasil visual
```text
┌─ Header ────────────────────────────────────────┐
│ ← SPK-2026-000123        [Cloud Auto-saved]     │
│ Stroban Ciputat · 12 Feb 2026 · 8/11 item      │
│ ───────── progress bar tipis ──────────          │
└─────────────────────────────────────────────────┘
  (tidak ada chip 1..11, tidak ada Draft→Selesai,
   tidak ada badge Draft)

  Customer  … (judul biasa, tanpa nomor)
  Vehicle   …
  Complaint …
  Service Order …
  Pengerjaan Mekanik (tabs)
  Finalisasi Pengerjaan
  AI Health · Print

┌─ Bottom ────────────────────────────────────────┐
│ ← Kembali          [ Selesaikan SPK ]           │
└─────────────────────────────────────────────────┘
```

## Verifikasi setelah build
1. `/spk/:id` — chip 1–11, strip Draft→…→Selesai, dan badge Draft di header hilang total.
2. Semua card muncul berurutan tanpa nomor, tanpa collapse, tanpa pill status per section.
3. Autosave chip, progress bar tipis, tombol Kembali, tombol "Selesaikan SPK" tetap berfungsi.
4. Role-based visibility tetap jalan (misal customer tidak melihat blok mekanik) karena `useSectionBinding` masih dipanggil.

Boleh saya lanjutkan implementasi?
