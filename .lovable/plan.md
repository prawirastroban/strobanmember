# Rencana Perbaikan

## Masalah
1. `EstimasiTable.tsx` — kolom summary "Product / Sub Total / Diskon / TOTAL" menumpuk vertikal sempit di sisi kanan → teks jadi memanjang ke bawah dan pecah di mobile. Warna merah solid + kotak putih tidak konsisten dengan tema liquid glass aplikasi.
2. `SPKCanvas.tsx` bottom bar masih menampilkan `StaffRevisionEscape`, `CustomerBypassApprove`, `QuickFinishSpk`, dan `WorkflowActionBar` sekaligus → user harus melewati approval customer & final QC dulu sebelum bisa selesai. User ingin cukup satu tombol "Selesaikan" saat data penting lengkap.

## Perubahan

### A. `src/components/spk/canvas/v2/EstimasiTable.tsx` — redesign liquid glass + responsive
- Ganti header merah blok solid → glass panel: `rounded-2xl border border-white/15 bg-gradient-to-br from-red-500/15 via-background/40 to-background/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(255,43,43,0.35)]` dengan judul + ikon.
- Header kolom desktop pakai token `text-muted-foreground`, garis pemisah `border-white/10` (bukan garis merah).
- Row item (`EstimasiRow`):
  - Container: `rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10` (mobile stack), desktop tetap grid.
  - Input pakai `bg-background/40 border border-white/10 focus:border-primary/60 focus:ring-1 focus:ring-primary/40 rounded-lg`.
  - Tombol OK/BAD/✓/✗ pakai variasi warna semantik (`bg-amber-400/20 text-amber-200`, `bg-destructive/20`, `bg-emerald-500/20`, dst) + state aktif dengan glow ring.
- **Summary card (fix utama layout)**:
  - Ganti `w-full md:w-1/2 lg:w-2/5` → **grid responsif 2 kolom di ≥sm**: 4 baris (Product, Sub Total, Diskon Jasa, Diskon Sparepart) jadi `grid grid-cols-1 sm:grid-cols-2 gap-3`, masing-masing sebagai mini glass tile (label kecil di atas, nilai besar di bawah) sehingga tidak lagi menumpuk vertikal sempit.
  - "TOTAL PAYMENTS" jadi footer full-width dengan gradien merah glass + angka besar rata kanan; menyesuaikan lebar di semua device (`w-full` bukan `md:w-1/2`).
  - Card outer: `rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-lg overflow-hidden`.
- Tombol "Tambah Item": glass outline `border-dashed border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl`.
- Semua warna via token semantik (`primary`, `destructive`, `muted-foreground`) — hapus hex hardcoded `#ff0000`/`#ffcc00`/dll.

### B. `src/pages/spk/SPKCanvas.tsx` — sederhanakan bottom action bar
- Hapus render `<StaffRevisionEscape/>`, `<CustomerBypassApprove/>`, `<QuickFinishSpk/>`, dan `<WorkflowActionBar/>` dari container fixed bottom (baris 466–490).
- Ganti dengan satu tombol utama **"Selesaikan SPK"** + tombol sekunder **"Batalkan / Kembali"**.
  - Container bar dibuat liquid glass: `bg-background/60 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.4)]`.
  - Tombol utama: gradien primary + glow, full-width di mobile, kanan di desktop, disabled saat field wajib belum lengkap (`Object.keys(runtime.issues).length > 0` atau signature admin/mekanik kosong).
  - Klik → panggil `runtime.validateAll()`, lalu bila valid langsung tutup SPK: pakai handler `onFinishFallback` yang sudah ada (update `spk_orders.status = 'closed'` + insert timeline event `closed`) tanpa lewat `awaiting_customer_approval` / `qc_pending`.
- Komponen `StaffRevisionEscape`, `CustomerBypassApprove`, `QuickFinishSpk`, `WorkflowActionBar` **tidak dihapus** dari file (masih dipakai definisinya di bawah) — cukup tidak dirender lagi. Ini menjaga risiko regresi tetap rendah; bisa dibersihkan di pass berikutnya bila diinginkan.
- Banner `CustomerActionBanners` (approval request customer) tetap ada karena masih dipakai untuk info pasif; jika Anda ingin ini juga dihilangkan, sebut saja dan saya ikutkan.

### C. Cek konsistensi
- Tidak ada perubahan skema DB, workflow engine, atau logika RLS.
- Tidak menyentuh PDF generator, timeline, atau notifikasi customer.

## Ruang lingkup yang **tidak** diubah
- File Runtime, WorkflowEngine, AutomationEngine, PDF, service packages.
- Section 1–4 dan tab Safety / General di canvas.

## Verifikasi setelah build
1. Buka `/spk/:id` → EstimasiTable: summary kini 2×2 tiles + total footer full-width, tidak ada teks memanjang vertikal, glass consistent.
2. Resize ke 375px & 1440px → tidak ada overflow / layout pecah.
3. Bottom bar: hanya tombol "Selesaikan SPK"; klik → status berubah ke `closed`, toast sukses, timeline mendapat entri baru.
4. Bila ada field wajib kosong, tombol disabled + banner "isian belum valid" muncul.

Boleh saya lanjutkan implementasi?