## Tujuan
Di halaman **/dashboard/spk/all**, tambahkan dua fitur di setiap kartu SPK:
1. **Lihat SPK** — buka preview format SPK dalam pop-up (dialog), tanpa navigasi ke halaman `/spk/:id/print`.
2. **Bagikan PDF** — bagikan hasil PDF SPK via Web Share API (fallback WhatsApp / unduh biasa).

## Perubahan

### 1. Komponen baru: `src/components/spk/SPKViewDialog.tsx`
- Menerima props `spkId: string`, `open: boolean`, `onOpenChange`.
- Render `Dialog` full-screen-ish (`max-w-4xl`, `h-[90vh]`) dengan `<iframe src={`/spk/${spkId}/print?embed=1`}>` mengisi tinggi penuh.
- Header dialog: nomor SPK + tombol close.
- Tetap ringan: iframe memuat halaman print yang sudah ada; tidak duplikasi logic render.

### 2. `src/pages/spk/SPKPrint.tsx`
- Deteksi query `?embed=1` via `useSearchParams`; saat aktif, sembunyikan sticky top header (tombol back + judul + unduh) supaya iframe tampil bersih di dalam dialog. Konten SPK tetap dirender normal.
- Ekstrak logic PDF-blob agar bisa dipakai ulang:
  - `buildPdfBlob()` — return `{ blob, filename }` (kode `html2canvas` + `jsPDF` yang sudah ada, diubah untuk `pdf.output("blob")` alih-alih `pdf.save`).
  - `downloadPdf()` panggil `buildPdfBlob()` lalu `saveAs` blob.
- Tambah tombol **Bagikan** di header (icon `Share2`, tersembunyi di mode `embed=1`):
  - Jika `navigator.canShare?.({ files: [file] })` → panggil `navigator.share({ files, title, text })`.
  - Fallback: buka `https://wa.me/?text=...` dengan link publik SPK (`window.location.origin + /spk/:id/print`) + toast info "Silakan lampirkan PDF yang sudah diunduh" + trigger unduh PDF.
  - State `sharing` untuk spinner.

### 3. `src/pages/spk/admin/SPKAllList.tsx`
- Tambah state `viewTarget: SpkCard | null` di komponen `SPKAllList`.
- Di `SpkCardItem`, tambah props `onView: () => void` dan `onShare: () => void`.
- Tambah dua tombol icon-only (compact di mobile, dengan label di ≥sm) di area action bar bersebelahan dengan Edit/Hapus, muncul untuk **semua user** (tidak dibatasi `canManage`):
  - **Lihat** — icon `Eye` → panggil `onView` (buka dialog).
  - **Bagikan** — icon `Share2` → panggil `onShare` (buka dialog + trigger share otomatis via query `?share=1`).
- `e.stopPropagation()` supaya tidak trigger navigasi kartu.
- Ubah row action wrapper agar tetap muncul walau `canManage=false` (khusus untuk Lihat/Bagikan).
- Render `<SPKViewDialog spkId={viewTarget.id} open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)} />` di akhir tree.

### 4. Auto-share pada dialog (opsional, sederhana)
- Ketika dialog dibuka via tombol "Bagikan", pass prop `autoShare` ke `SPKViewDialog`; komponen post-message ke iframe atau tambahkan `?share=1` di URL. Di `SPKPrint`, jika `share=1`, jalankan `handleShare()` otomatis pada `useEffect` setelah data ter-load.
- Jika ini menambah kompleksitas, cukup: tombol Bagikan di kartu buka dialog view; user klik tombol "Bagikan" di dalam dialog. **Pendekatan yang dipilih**: mode sederhana — Bagikan di kartu langsung buka dialog + iframe URL `?embed=1&share=1`, `SPKPrint` men-trigger share sekali setelah load.

## Tidak termasuk
- Tidak mengubah logika data, RLS, atau workflow.
- Tidak mengubah tampilan konten SPK di halaman print (hanya toggle visibility header saat mode embed).
- Tidak menambah dependency baru (Web Share API native, `html2canvas`+`jsPDF` sudah ada).

## Teknis
- Web Share API `navigator.share({ files })` didukung di Chrome Android, Safari iOS. Fallback WhatsApp `wa.me` + unduh dipakai untuk desktop / browser lama.
- File PDF nama: `SPK-{spk_number}.pdf`.
