## Plan: Hint Tombol Bukti Transfer

### Ringkasan
Ubah tombol "Bukti" di `/dashboard/keuangan/payment` agar menampilkan ikon peringatan (abu/merah muda) dan label "Belum Ada" jika belum ada bukti transfer yang diunggah. Tombol tetap bisa diklik — saat diklik akan tetap menampilkan toast "Belum ada bukti transfer".

### Perubahan File

#### 1. `src/components/admin/keuangan/TransferProofButton.tsx`
- Tambahkan state `hasProof: boolean | null` (null = sedang cek)
- Gunakan `useEffect` saat mount untuk melakukan count query ke tabel `manual_payment_proofs` via `supabase.rpc` atau `.select('*', { count: 'exact', head: true })`
- Jika `paymentMethod` tidak termasuk `transfer`/`qris`, tetap return `null` (tidak render)
- Ubah ikon dan label berdasarkan `hasProof`:
  - `hasProof === true` → ikon `Receipt` biru + label "Bukti" (seperti sekarang)
  - `hasProof === false` → ikon `FileWarning` abu-merah + label "Belum Ada"
  - `hasProof === null` → ikon `Receipt` abu + label "Bukti" (loading state)
- Warna tombol menyesuaikan:
  - Ada bukti: `text-blue-600 hover:text-blue-700 hover:bg-blue-500/10`
  - Belum ada: `text-muted-foreground hover:text-foreground hover:bg-muted/30`

#### 2. `src/components/admin/PaymentsManager.tsx` (opsional, jika diperlukan)
- Jika ada perubahan query, tambahkan join ke `manual_payment_proofs`. Tapi prefer solusi self-contained di komponen agar minimal impact.

### Detail Teknis
- Query count menggunakan `.select('id', { count: 'exact', head: true })` untuk efisiensi (tidak mengambil data, hanya header count)
- Gunakan `Tooltip` (sudah tersedia di `@radix-ui/react-tooltip` via `src/components/ui/tooltip.tsx`) untuk menampilkan hint "Belum ada bukti transfer" saat hover pada tombol warning
- Ikon `FileWarning` dari `lucide-react`