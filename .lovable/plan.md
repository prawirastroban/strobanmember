
# SPK v2 — Intake dengan Signature & Auto-Publish ke Mekanik

Menyesuaikan halaman `/spk/new` supaya section 1–4 tetap ada + menambahkan section signature (Admin + Customer). Tombol **"Buat SPK"** langsung mem-publish SPK sampai fase **Pengerjaan Mekanik** (bukan draft), sehingga SPK langsung muncul di antrian mekanik.

## 1. UI — tambahan section di `src/pages/spk/SPKNewForm.tsx`

Setelah section "Keluhan Pelanggan" tambah **Section 5: Persetujuan & Tanda Tangan**:

```text
┌─ Persetujuan & Tanda Tangan ────────────────┐
│  Tanda tangan Admin *      Tanda tangan Customer * │
│  [SignaturePad]            [SignaturePad]          │
│  [Bersihkan]               [Bersihkan]             │
│                                                    │
│  ☑ Customer menyetujui isi SPK ini                 │
└────────────────────────────────────────────────────┘
```

- Gunakan komponen `SignaturePad` yang sudah ada (`src/components/spk/canvas/SignaturePad.tsx`) — versi non-bound, cukup `onChange(dataUrl)` disimpan ke state lokal `signatureAdmin` & `signatureCustomer`.
- Validasi tambahan (di luar Zod): kedua signature wajib ada + checkbox persetujuan wajib dicentang sebelum `Buat SPK` bisa disubmit. Kalau kosong, toast "Tanda tangan admin & customer wajib diisi" dan scroll ke section.
- Field admin ter-disable bila role bukan admin/staff/admin_cabang.

## 2. Data yang ikut dikirim saat create

Di `handleSubmit`, tambahkan ke `initialData` yang dikirim ke `SPKService.create()`:

```ts
signature_admin: signatureAdmin,        // dataURL PNG
signature_customer: signatureCustomer,  // dataURL PNG
customer_approved_at: new Date().toISOString(),
customer_approval_source: "intake_admin_device", // dibuat di device admin
```

Field-field ini sudah dibaca oleh `SPKPrint` / `SignaturePadBound` (kode field `signature_admin`, `signature_customer`, `signature_mekanik`), jadi otomatis muncul di Canvas & PDF tanpa perubahan lain.

## 3. Auto-publish ke fase Mekanik (bukan draft)

Setelah `SPKService.create()` sukses, jalankan dua transisi berurutan via `WorkflowService.transition` (workflow_code `spk_default`):

1. `draft → awaiting_customer_approval`
2. `awaiting_customer_approval → in_progress`

Kalau salah satu transisi gagal (misal aturan workflow belum sesuai), tampilkan toast peringatan tapi tetap arahkan user ke Canvas — SPK masih ada, statusnya bisa dinaikkan manual.

Redirect terakhir tetap `navigate(/spk/${id})`, sehingga admin bisa langsung melihat Canvas dengan status **Pengerjaan Mekanik** dan section 1–4 sudah terisi + signature admin/customer sudah tampak.

## 4. Efek samping yang otomatis benar

- `spk_events` / `spk_timeline` akan mencatat transisi `spk_created → awaiting_customer_approval → in_progress` (via `EventService` yang sudah dipanggil `WorkflowService`).
- Mekanik langsung melihat SPK di list `status = in_progress` (mekanik dashboard & SPKAllList sudah filter status ini).
- Notifikasi `pingCustomerForApprovalOnce` **tidak** perlu ter-trigger karena approval sudah dilakukan tatap muka di device admin — kita akan skip pemanggilannya untuk jalur intake baru (SPK ini tidak berhenti di `awaiting_customer_approval`, jadi hook `useSPKWorkflow` tidak akan mengirim ping). Cukup pastikan urutan transisi berjalan cepat (dua panggilan `await` berturut-turut).

## 5. Ringkasan file yang berubah

- `src/pages/spk/SPKNewForm.tsx` — tambah state signature + checkbox, section UI baru, validasi, kirim ke `initialData`, dua transisi workflow setelah create.

Tidak ada perubahan schema DB, tidak ada perubahan service lain — semua reuse: `SignaturePad`, `SPKService.create`, `WorkflowService.transition`.

## Catatan teknis

- `SignaturePad` menerima `onChange(dataUrl: string)`; simpan `null` saat pad dibersihkan. Ini kompatibel dengan `SignaturePadBound` yang membaca dari `data.signature_admin` / `data.signature_customer` di Canvas.
- Karena signature dikirim sebagai bagian dari `data` di `INSERT`, tidak perlu update kedua ke `spk_orders` (menghindari race dengan `SignaturePadBound` yang debounce 400ms).
- Actor untuk kedua transisi memakai `actor` yang sudah dihitung dari role user login (admin/staff/admin_cabang/reception).
