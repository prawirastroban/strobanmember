## Tujuan

Saat SPK dibuat dari data aplikasi (customer punya akun / booking), tombol permintaan approval di halaman SPK harus **mengandalkan notifikasi in-app** — yaitu badge ikon mobil dengan titik merah + label **"Approve SPK"** di Navbar customer (seperti gambar yang diunggah) — bukan hanya "Salin Link" eksternal.

Infrastruktur untuk badge sebenarnya sudah jalan: `Navbar.tsx` sudah subscribe realtime ke `spk_orders` filter `customer_id=eq.<user>` dan otomatis switch ke chip "Approve SPK" ketika status = `awaiting_customer_approval`. Yang kurang hanya: (1) staff tidak diarahkan ke jalur ini, (2) customer tidak dapat notifikasi eksplisit (lonceng) di luar badge.

## Perubahan

### 1. `src/pages/spk/SPKCanvas.tsx` — `StaffApprovalRequestNotice`
- Deteksi apakah SPK terhubung ke akun customer (via `spk.customer_id` — sudah ada, atau join dari booking).
- Ganti banner "Menunggu approval customer" jadi **dua mode**:
  - **Mode In-App** (ada `customer_id`): banner hijau "Notifikasi sudah dikirim ke aplikasi customer" + ikon mobil kecil (mirroring gambar) + info "Customer akan melihat tombol **Approve SPK** di halaman utama aplikasi". Tombol utama: **"Kirim Ulang Notifikasi"** (re-ping) — bukan Salin Link. Tombol sekunder: "Salin Link" (fallback opsional, disembunyikan di collapse).
  - **Mode Walk-in** (tanpa `customer_id`): pertahankan banner amber + "Salin Link" seperti sekarang.

### 2. Auto-notify ke lonceng saat masuk `awaiting_customer_approval`
- Di `useSPKWorkflow.ts` (atau `AutomationBootstrap`), setelah transition sukses ke `awaiting_customer_approval` dan `spk.customer_id` tersedia → insert satu baris ke `notifications`:
  - `user_id = customer_id`
  - `type = "spk_approval_request"`
  - `title = "SPK menunggu persetujuan Anda"`
  - `body = "Ketuk untuk meninjau & menandatangani."`
  - `link = /spk/<id>/approve` (dipakai oleh NotificationBell)
- Idempoten: skip insert jika sudah ada notifikasi tipe sama untuk SPK ini yang belum dibaca.

### 3. Tombol "Kirim Ulang Notifikasi"
- Handler `resendCustomerPing(spkId)`:
  - Insert baris baru di `notifications` (tipe `spk_approval_reminder`) sehingga lonceng berdenting lagi.
  - Toast: "Notifikasi terkirim ke aplikasi customer".
  - Rate-limit lokal 60 detik (disabled state + countdown) supaya tidak spam.

### 4. UX pemetaan visual dengan gambar
- Chip ikon mobil + titik merah kecil di banner staff, sebagai preview "seperti inilah yang akan customer lihat di aplikasinya", untuk memberi konteks visual.

## Yang TIDAK diubah
- Alur workflow (`Draft → awaiting_customer_approval → …`) tetap.
- Halaman `SPKCustomerApprove.tsx`, `CustomerSPKCard.tsx`, dan `Navbar.tsx` (subscription + badge) sudah benar — tidak disentuh.
- `CustomerBypassApprove` (tanda tangan di device bengkel) tetap tersedia untuk kasus walk-in / customer di lokasi.
- Tidak ada perubahan database schema (tabel `notifications` sudah ada; hanya insert baru).

## Detail teknis
- File yang diedit:
  - `src/pages/spk/SPKCanvas.tsx` — refactor `StaffApprovalRequestNotice` menjadi 2 mode + tombol resend.
  - `src/hooks/spk/useSPKWorkflow.ts` — hook auto-insert notifikasi setelah transition ke `awaiting_customer_approval`.
- Kolom `spk_orders.customer_id` (uuid, nullable) dipakai sebagai penanda "SPK dari aplikasi".
- Insert ke `notifications` mengikuti pola yang sudah ada di modul lain (mis. `NotificationBell` reader).
