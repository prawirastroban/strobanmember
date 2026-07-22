## Tujuan

Saat ini tombol **Bagikan** di header `SPKViewDialog` memicu Web Share API (share file PDF via postMessage → iframe `SPKPrint`). User ingin perilaku baru: tombol membuka panel share bergaya **BookingShareCard** (hasil Quick Booking) — menampilkan **QR code + link publik SPK + tombol salin + kirim WhatsApp**, sehingga admin bisa membagikan link/scan ke customer, mirip link aktivasi / tracking live progress.

## Ruang Lingkup (UI/UX saja)

- Tidak menambah kolom database, tidak mengubah edge function.
- Link publik memakai rute yang sudah publik: `/spk/:id/print` (sudah bukan `ProtectedRoute` di `src/App.tsx`).
- Tombol **Unduh** tetap seperti sekarang (postMessage `download` ke iframe).

## Perubahan

### 1. Komponen baru `src/components/spk/SPKShareCard.tsx`

Meniru pola `src/components/admin/BookingShareCard.tsx` tetapi untuk SPK. Isi:

- Judul: "Bagikan SPK" + nomor SPK.
- QR code (pakai `qrcode.react` yang sudah terpasang) berisi `shareUrl`.
- Kartu ringkas: nomor SPK, customer, plat/kendaraan, cabang, tanggal.
- Input readonly berisi `shareUrl = ${origin}/spk/:id/print` + tombol salin (icon `Copy`/`CheckCircle2`).
- Pesan WA siap pakai (Bahasa Indonesia, format sama gaya BookingShareCard):
  ```
  Halo {firstName}, berikut Surat Perintah Kerja (SPK) Anda di Sahabat Stroban Service.
  SPK       : {spk_number}
  Kendaraan : {vehicle_desc} {plate}
  Cabang    : {branch}
  Tanggal   : {service_date}
  Lihat detail & unduh PDF:
  {shareUrl}
  Terima kasih 🙏
  ```
- Tombol grid 2 kolom: **Kirim via WhatsApp** (hijau `#25D366`, pakai `openWhatsApp` dari `src/lib/whatsapp.ts` dengan phone dinormalisasi) & **Salin Pesan**.
- Fallback ketika `phone` kosong: tombol WA disabled + hint "Nomor HP customer kosong — share manual via Salin Pesan".

Props:
```ts
{
  spkId: string;
  spkNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleLabel?: string | null;
  branch?: string | null;
  serviceDate?: string | null;
  onClose?: () => void;
}
```

### 2. Ubah `src/components/spk/SPKViewDialog.tsx`

- Terima props tambahan (opsional) yang dibutuhkan `SPKShareCard`: `customerName`, `customerPhone`, `vehicleLabel`, `branch`, `serviceDate`. Semua opsional — kalau tidak dikirim, kartu tetap tampil dengan link + QR saja.
- Ganti perilaku tombol **Bagikan** di header: tidak lagi `post("share")`. Sekarang membuka **AlertDialog / nested Dialog** kecil (atau state `showShare`) yang me-render `<SPKShareCard ... />`.
- Hapus `autoShare` prop yang sekarang tidak lagi diperlukan dari sisi konsumen (biarkan prop tetap ada tapi tidak dipakai; atau hapus & sesuaikan caller — lihat langkah 3). Tombol **Unduh** tetap `post("download")`.

### 3. `src/pages/spk/admin/SPKAllList.tsx`

- Kirim data tambahan ke `SPKViewDialog` (sudah tersedia di `SpkCard`: `customer_name`, `phone`, `vehicle_desc` + `plate_number`, `branch_name`, `service_date`, `spk_number`).
- Handler tombol **Bagikan** pada tiap kartu SPK: langsung buka `SPKViewDialog` dengan flag baru `initialShareOpen` (atau tanpa flag — user tinggal klik "Bagikan" di header dialog). Rekomendasi: tambahkan prop `initialShareOpen?: boolean` sehingga klik "Bagikan" dari list langsung memunculkan panel share tanpa perlu klik dua kali. `autoShare` lama dihapus.

### 4. Bersih-bersih

- `src/pages/spk/SPKPrint.tsx`: biarkan logika `?share=1` & bridge `spk-print` (masih dipakai untuk **Unduh**). Bagian auto-share via postMessage tidak lagi dipanggil dari UI baru, tapi kode iframe bridge tetap kompatibel.

## Detail Teknis

- Import `QRCodeSVG` dari `qrcode.react` (`size={180}`, dengan padding + `bg-white p-3 rounded-xl`).
- `normalizePhone62` disalin/reuse (`buildWhatsAppUrl` dari `@/lib/whatsapp` sudah menormalisasi + membuka lewat `openExternal`, aman di native).
- Semua warna via token tema (`bg-card`, `text-muted-foreground`, `text-primary`) — tidak hardcode kecuali brand WA `#25D366` (konsisten dg BookingShareCard).

## Diagram Alur

```text
Klik "Bagikan" (list) 
  → buka SPKViewDialog dg initialShareOpen=true
  → tampil panel SPKShareCard (QR + link + tombol Salin + WA)
Klik "Bagikan" (header dialog)
  → toggle panel SPKShareCard
Klik "Unduh" (header dialog)
  → tetap postMessage(download) ke iframe SPKPrint
```

## Verifikasi

- Buka `/dashboard/spk/all`, klik **Bagikan** pada satu kartu → dialog muncul dengan QR & link.
- Salin link → paste di tab incognito → route `/spk/:id/print` terbuka publik.
- Klik **Kirim via WhatsApp** → membuka `wa.me/62…` dengan pesan pre-filled.
- Tombol **Unduh** tetap men-download PDF.
