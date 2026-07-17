
## Tujuan
Sebelum tombol **Selesaikan SPK** bisa memproses, mekanik wajib:
1. Menandatangani `signature_mekanik` di kartu Finalisasi.
2. Mencentang beberapa checkbox konfirmasi pemeriksaan akhir.

## Perubahan

### 1. `src/components/spk/canvas/FinalizationCard.tsx`
- Tambahkan blok baru **"Konfirmasi Pemeriksaan Akhir"** (ikon `ClipboardCheck`) di atas Signature.
- 4 checkbox (bind ke runtime `useBinding<boolean>`):
  - `final_check_inspection` — "Semua item Safety & General Check sudah dikerjakan"
  - `final_check_estimasi` — "Estimasi sparepart sudah dikonfirmasi ke customer"
  - `final_check_kebersihan` — "Kendaraan sudah dirapikan & dibersihkan"
  - `final_check_ready` — "Kendaraan siap diserahkan ke customer"
- Setiap checkbox punya `data-field="<key>"` agar auto-scroll ke error bekerja.
- Gunakan komponen `Checkbox` dari `@/components/ui/checkbox` + label, tema selaras (glass row).

### 2. Enforcement di `FinishActionBar.handleFinish` (`src/pages/spk/SPKCanvas.tsx`)
Sebelum `runtime.validateAll()`, tambahkan pre-check ringan yang lebih informatif (agar mekanik tidak bingung):

```
const v = runtime.values as Record<string, unknown>;
const sig = typeof v.signature_mekanik === "string" ? v.signature_mekanik.trim() : "";
const missingChecks = [
  ["final_check_inspection","Konfirmasi inspeksi"],
  ["final_check_estimasi","Konfirmasi estimasi"],
  ["final_check_kebersihan","Konfirmasi kebersihan"],
  ["final_check_ready","Konfirmasi siap serah"],
].filter(([k]) => !v[k]);

if (!sig) {
  toast.error("Tanda tangan mekanik wajib diisi");
  scrollTo signature_mekanik; return;
}
if (missingChecks.length) {
  toast.error(`Checklist final belum lengkap (${missingChecks.length})`);
  scrollTo first missing; return;
}
```

### 3. Wiring validasi runtime
Tambahkan 5 field baru pada metadata section `sec-notes` (di `SPKCanvas.tsx` `SECTIONS`) sebagai `required` untuk role `mekanik` sehingga:
- Progress bar ikut menghitungnya.
- `runtime.validateAll()` menandai kekurangan seperti field lain.
- Field: `signature_mekanik` (sudah ada — pastikan tetap required), `final_check_inspection`, `final_check_estimasi`, `final_check_kebersihan`, `final_check_ready`.

### 4. Persistensi
Nilai checkbox otomatis tersimpan via autosave `FormRuntimeProvider` (sama seperti field lain) → muncul di PDF/riwayat lewat `spk_orders.data`. Tidak ada perubahan skema DB.

## Catatan
- Hanya UI + validasi frontend; tidak menyentuh workflow engine, RLS, atau tabel.
- Tema glass mengikuti card Finalisasi yang ada (border `border-white/10`, `bg-white/5`).
