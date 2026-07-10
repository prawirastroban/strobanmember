## Tujuan
Membedakan alur approval & tanda tangan SPK berdasarkan sumber pembuatannya:

- **SPK dari booking aplikasi** → approval mandiri oleh konsumen di aplikasi (badge + halaman approve dedicated).
- **SPK walk-in (bukan dari booking)** → tanda tangan di device staff (Section 11 Canvas seperti sekarang) — direkomendasikan karena konsumen fisik ada di lokasi, tanpa perlu login/link tambahan.

## Perubahan

### 1. Halaman approval konsumen — `/spk/:id/approve` (baru)
File baru: `src/pages/spk/SPKCustomerApprove.tsx`

Isi halaman:
- Guard: hanya bisa diakses bila `spk_orders.customer_id === auth.uid()` DAN `booking_id` tidak null. Kalau tidak, tampilkan pesan "Approval hanya tersedia untuk SPK dari booking aplikasi. Silakan lakukan tanda tangan di bengkel."
- Ringkasan SPK: nomor, cabang, kendaraan, tanggal, status.
- Ringkasan AI Health (dari `ai_health_report`) — reuse tampilan CustomerSPKCard.
- Ringkasan pekerjaan: keluhan customer + item pekerjaan (dari `spk_orders.data`).
- Signature pad khusus customer (reuse `SignaturePadBound` dengan code `signature_customer`), dibungkus `FormRuntimeProvider` read-only kecuali field signature.
- Dua tombol besar:
  - **Setuju & Tanda Tangan** → validasi signature terisi → panggil `useSPKWorkflow.transition("customer_approve")` → toast + redirect ke `/my-booking`.
  - **Perlu Revisi** → prompt catatan (Textarea) → simpan ke `data.customer_revision_note` + transition `customer_reject` (bila ada di workflow; jika tidak, cukup simpan note dan tampilkan pesan hubungi bengkel).

Tambahkan route di `src/App.tsx` di dalam grup terautentikasi.

### 2. Badge approval di `CustomerSPKCard.tsx`
- Deteksi status `awaiting_customer_approval` (atau flag serupa dari workflow) dan `booking_id` ada.
- Tampilkan badge merah berkedip **"Butuh Persetujuan Anda"** + ubah link tujuan dari `/spk/:id/print` menjadi `/spk/:id/approve`.
- Untuk status lain tetap ke `/spk/:id/print` (read-only preview) seperti sekarang.

### 3. Auto-redirect dari MyBooking (opsional halus)
Di `MyBooking.tsx`, kalau ada SPK dengan status `awaiting_customer_approval` untuk booking aktif, tampilkan banner di atas ("SPK #… menunggu persetujuan Anda — Approve sekarang") mengarah ke `/spk/:id/approve`.

### 4. Section 11 (Canvas) — perilaku
Tidak berubah:
- Signature Admin & Mekanik QC → tetap di Canvas (staff/mekanik).
- Signature Customer → tetap tersedia untuk walk-in (staff serahkan device).
- Kalau SPK dari booking dan sudah di-approve konsumen via `/spk/:id/approve`, signature_customer sudah otomatis terisi dari halaman approval — Canvas cukup menampilkan preview signature-nya (read-only) dengan label "Ditandatangani konsumen via aplikasi pada …".

Detail teknis: `SignaturePadBound` sudah menyimpan ke `spk_orders.data.<code>`, jadi cukup tambahkan mode `readonlyIfFilledBySource: "app"` yang menampilkan gambar tanpa mengizinkan hapus jika `data.signature_customer_source === "app"`. Halaman `/spk/:id/approve` set flag ini saat menyimpan.

### 5. Ringkasan alur akhir
```text
Sumber SPK          | TTD Admin        | TTD Customer                              | TTD Mekanik QC
────────────────────┼──────────────────┼───────────────────────────────────────────┼────────────────
Booking (aplikasi)  | Canvas Section 11| /spk/:id/approve (di HP konsumen sendiri) | Canvas Section 11
Walk-in (non-book)  | Canvas Section 11| Canvas Section 11 (di device staff)       | Canvas Section 11
```

## Non-goals
- Tidak menambah magic-link/WA token flow (bisa jadi phase berikutnya).
- Tidak mengubah struktur workflow — reuse transition existing (`customer_approve` yang sudah ada di flow 3-hop).
- Tidak menyentuh schema database (hanya menulis ke `spk_orders.data` seperti biasa).
