## Masalah

### 1. Grid input Nominal & Tanggal Transfer tidak simetris (gambar 1)
Kolom kedua (Tanggal Transfer) tampak melebihi lebar kartu pada layar mobile. Penyebab: `<Input type="date">` di iOS/Android punya `min-width` intrinsik (placeholder "MM/DD/YYYY" + ikon kalender), sehingga grid `grid-cols-2` di-stretch dan kolom kanan keluar jalur. Tag `<div>` pembungkus tidak punya `min-w-0` jadi flex/grid item tidak mau menyusut.

Lokasi yang sama:
- `src/components/payment/InlineProofUpload.tsx` (form upload bukti di status booking — yang difoto user)
- `src/pages/ManualPayment.tsx` (halaman pembayaran lengkap)
- `src/components/admin/keuangan/UploadProofDialog.tsx` (dialog admin)

### 2. URL panjang `https://yrwttzxrnomaiqxyjrqn.supabase.co/...` di viewer bukti pembayaran (gambar 2)
Tampil di `src/components/admin/keuangan/TransferProofButton.tsx` baris 213 — paragraph `proof.proof_url`. Tombol "Salin URL" / "Download" / "Buka Tab Baru" tetap dipertahankan (sesuai instruksi, hanya hapus link teksnya).

## Rencana

### Fix 1 — Simetri 2 kolom (Nominal + Tanggal)
Di tiga file di atas:
- Bungkus kedua kolom dengan kelas `min-w-0` agar grid item bisa menyusut.
- Pastikan `<Input>` dan `<CurrencyInput>` punya `w-full` (sudah default dari shadcn, cukup verifikasi).

Contoh perubahan minimal:
```tsx
<div className="min-w-0"> <Label …/> <CurrencyInput … className="h-9 w-full" /> </div>
<div className="min-w-0"> <Label …/> <Input type="date" … className="h-9 w-full" /> </div>
```

### Fix 2 — Hapus link URL di viewer bukti
Di `TransferProofButton.tsx` baris 213, hapus baris:
```tsx
<p className="col-span-2 font-mono text-[11px] break-all text-muted-foreground">{proof.proof_url}</p>
```

### Pengecekan menyeluruh
Sudah `rg` semua `grid-cols-2` yang memuat `type="date"` — hanya 3 file di atas. Grid lain (`EditBookingDialog`, `QuickBookingDialog`, `StaffQuickBookingDialog`) pakai `grid-cols-1 sm:grid-cols-2` (single column di mobile), jadi tidak terdampak.

## File yang berubah
- `src/components/payment/InlineProofUpload.tsx`
- `src/pages/ManualPayment.tsx`
- `src/components/admin/keuangan/UploadProofDialog.tsx`
- `src/components/admin/keuangan/TransferProofButton.tsx`

Tidak ada perubahan backend / RLS / DB.
