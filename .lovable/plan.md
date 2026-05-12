## Konteks

Di `/dashboard/keuangan/referral` tab **Pencairan**, flow status sebenarnya sudah ada di kode (`pending → approved → paid/rejected`) dengan RPC `approve_referral_withdrawal`, `mark_referral_withdrawal_paid`, dan `reject_referral_withdrawal`. Tombol **Setujui** juga sudah dirender saat `status = pending` (baris 421 `ReferralManager.tsx`).

Masalah yang masih kurang rapi:
1. Tombol **Setujui** langsung eksekusi tanpa konfirmasi & tanpa input catatan admin → mudah salah klik.
2. Saat **Tandai Sudah Ditransfer**, upload bukti transfer **opsional** padahal harusnya wajib supaya status `paid` selalu punya bukti.
3. Di viewport mobile (390px) tombol-tombol di kolom Aksi mepet/terpotong karena tabel scroll horizontal — staff sulit menemukan **Setujui**.
4. Tidak ada indikator visual yang jelas bahwa flow harus berurutan: `Menunggu → Setujui → Siap Transfer → Tandai Sudah Ditransfer (wajib bukti) → Sudah Ditransfer`.

## Perubahan

### 1. Dialog konfirmasi "Setujui Pencairan"
- Tombol **Setujui** tidak lagi langsung memanggil RPC.
- Buka `AlertDialog` baru berisi:
  - Ringkasan: nama user, bank/rek, nominal.
  - Field opsional **Catatan admin** (textarea, akan disimpan di `admin_note`).
  - Tombol **Batal** dan **Ya, Setujui**.
- Setelah disetujui, status menjadi `approved` (label "Siap Transfer") dan baris pindah otomatis (sudah realtime).

### 2. Wajibkan bukti transfer di "Tandai Sudah Ditransfer"
- Di dialog `payOpen`:
  - Tandai field upload bukti dengan label **wajib** (bintang merah + "Bukti transfer wajib diunggah").
  - Disable tombol submit jika `payFile` kosong.
  - Validasi tipe file (image/pdf) dan ukuran maksimal ~5MB.
- Catatan admin tetap opsional.
- Setelah submit, status → `paid`, `proof_url` tersimpan, dan tombol **Detail** menampilkan link bukti.

### 3. Aksi mobile-friendly
- Untuk viewport <640px: ubah cell aksi jadi tumpukan vertikal (`flex flex-col gap-1`) dengan tombol full-width sehingga **Setujui / Tolak / Tandai Sudah Ditransfer** semua terlihat tanpa scroll horizontal.
- Tetap horizontal pada desktop.

### 4. Helper teks alur
- Di header Card Pencairan, tambahkan baris kecil muted: "Alur: Menunggu → Setujui → Siap Transfer → Tandai Sudah Ditransfer (lampirkan bukti) → Sudah Ditransfer".
- Memperjelas urutan yang harus diikuti staff keuangan.

### 5. Tidak diubah
- Skema database, RPC, RLS, bucket `withdrawal-proofs` — semua sudah memadai.
- Tab Komisi, Voucher, dan Pengaturan tidak disentuh.
- Sisi user (`/referral`) tidak berubah.

## File yang disentuh
- `src/components/admin/keuangan/ReferralManager.tsx` saja.
