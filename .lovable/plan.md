## Masalah

Di halaman `/payment/manual/:id` (dan komponen `InlineProofUpload` di `/my-booking/:id`), input file menggunakan shadcn `<Input type="file" />`. Class styling shadcn (`h-9`/`h-10`, padding, `file:` pseudo) bikin area klik tombol "Choose File" di mobile WebView/Chrome Android sering tidak responsif — user tap tapi picker tidak terbuka. Inilah yang user tandai dengan lingkaran merah di screenshot.

## Perbaikan

Ganti pola "Input type=file yang di-styling" → **hidden input + tombol besar custom** yang memanggil `inputRef.current?.click()`. Pola ini bekerja reliable di Chrome Android, iOS Safari, dan Capacitor WebView.

### 1. `src/pages/ManualPayment.tsx` (baris 419–442)

```tsx
const fileRef = useRef<HTMLInputElement>(null);

<input
  ref={fileRef}
  id="proof"
  type="file"
  accept="image/*,application/pdf"
  className="hidden"
  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
/>
<Button
  type="button"
  variant="outline"
  onClick={() => fileRef.current?.click()}
  className="w-full h-12 justify-start gap-3 rounded-xl border-dashed"
>
  <Upload className="h-4 w-4 text-primary" />
  <span className="truncate">{file ? file.name : "Pilih File dari Galeri / Dokumen"}</span>
</Button>
```

Hint "Pilih dari Galeri atau File di HP Anda" tetap. Preview thumbnail tetap.

### 2. `src/components/payment/InlineProofUpload.tsx` (baris ~205)

Pola identik: hidden `<input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" />` + tombol outline full-width yang memanggil `fileRef.current?.click()`.

### 3. Tambahan kecil untuk Capacitor (opsional, aman)

Tidak perlu plugin baru. Input native via `click()` di WebView memunculkan dialog sistem Android (Galeri / Files / Camera). Tidak ada perubahan `capacitor.config.ts`.

## Yang TIDAK diubah

- RPC `submit_manual_payment_proof`, bucket `payment-proofs`, RLS — tidak diubah.
- Validasi Zod, ukuran 10MB, MIME check — tidak diubah.
- Flow upload setelah file terpilih — tidak diubah.

## Kenapa ini menyelesaikan masalah

Tombol custom punya area tap yang jelas (h-12, full width) dan secara programatik trigger `click()` pada input asli. Browser/WebView memperlakukan event ini sebagai user gesture sehingga dialog file picker pasti terbuka — beda dengan styled `<Input type="file" />` di mana sebagian area tap kadang tidak terdaftar sebagai klik pada elemen tombol bawaan input.
