## Penyempurnaan Tab Pencairan di `/dashboard/keuangan/referral`

Saat ini tab "Pencairan" sudah punya status & tombol Approve/Tolak/Tandai Bayar, tapi alur masih membingungkan dan tidak ada detail bukti transfer. Saya akan menyederhanakan & memperjelas workflow manual oleh staff keuangan.

### Status Workflow (final)

```text
pending  →  approved   →  paid     (sukses)
   └─→  rejected                   (saldo dikembalikan)
```

- **pending** — user baru ajukan, saldo sudah dikunci.
- **approved** — staff verifikasi data rekening valid, siap ditransfer.
- **paid** — staff sudah transfer ke rekening user (final, tidak bisa diubah).
- **rejected** — staff tolak, saldo dikembalikan ke `available_balance`.

### Aksi per Status

| Status | Tombol Aksi |
|---|---|
| **pending** | `Setujui` (→ approved) · `Tolak` (dialog alasan, → rejected) |
| **approved** | `Tandai Sudah Ditransfer` (dialog opsional unggah bukti & catatan, → paid) · `Tolak` |
| **paid / rejected** | `Lihat Detail` (read-only) |

### UI Yang Diubah pada Tab "Pencairan"

1. **Sub-filter status** di atas tabel: `Semua · Menunggu · Disetujui · Selesai · Ditolak` (badge count per filter).
2. **Kolom baru "Riwayat"**: tampilkan jejak waktu — Diajukan, Disetujui, Dibayar / Ditolak (dengan nama staff yang memproses).
3. **Status badge lebih jelas**:
   - `pending` → Menunggu (amber)
   - `approved` → Siap Transfer (sky)
   - `paid` → Sudah Ditransfer (emerald, dengan ikon ✓)
   - `rejected` → Ditolak (red)
4. **Tombol "Tandai Sudah Ditransfer"** membuka dialog dengan:
   - Field opsional: Tanggal transfer (default hari ini), Catatan staff, **Upload bukti transfer** (storage bucket `payment-proofs` reuse atau bucket baru `withdrawal-proofs`).
   - Setelah submit → panggil `mark_referral_withdrawal_paid` dengan `_proof_url`.
5. **Dialog detail** untuk pencairan yang sudah selesai/ditolak: tampilkan info rekening, nominal, riwayat status + foto bukti transfer (kalau ada).
6. **Realtime**: subscribe `referral_withdrawals` agar tabel auto-refresh saat ada permintaan baru.

### Penyesuaian Backend

- **Storage bucket baru** `withdrawal-proofs` (private, hanya staff dapat read/write) untuk simpan bukti transfer.
- Tidak perlu migration tabel — kolom `processed_by`, `processed_at`, `admin_note`, `proof_url`, `status` sudah ada.
- RPC `approve_referral_withdrawal`, `reject_referral_withdrawal`, `mark_referral_withdrawal_paid` sudah ada di database.

### File yang Disentuh

- `src/components/admin/keuangan/ReferralManager.tsx` — refaktor tab Pencairan: filter, kolom baru, dialog Tandai Bayar, dialog detail, realtime subscription.
- Migration baru: storage bucket `withdrawal-proofs` + policy staff-only.

### Bahasa & Format

- Semua label Bahasa Indonesia.
- Tanggal: `15 Oct 2023 14:30`.
- Currency: `Rp 150.000`.
