# Referral: Konversi Poin + Tampilan Poin + Persetujuan T&C

## Ringkasan
1. Admin di `/dashboard/keuangan/referral` bisa atur **Nilai 1 Poin (Rp)** — default `2500`.
2. Halaman `/referral` mengganti kartu saldo Rupiah menjadi kartu **Poin** (dihitung dari saldo Rp ÷ nilai 1 poin).
3. Tambah modal **Syarat & Ketentuan** yang wajib disetujui user sebelum bisa pakai fitur referral (tarik tunai, tukar voucher, share). Konten T&C juga diatur admin.

Saldo internal di DB tetap dalam **Rupiah** (tidak migrasi data lama). Poin hanya lapisan tampilan & input — saat tarik/tukar, poin user dikalikan rate jadi Rp lalu dipanggil RPC yang sudah ada.

---

## Perubahan Database (1 migration)

Tambah ke `referral_settings`:
- `point_value_rp numeric NOT NULL DEFAULT 2500` — nilai 1 poin dalam Rupiah.
- `terms_text text` — isi syarat & ketentuan referral (markdown / plain text).
- `terms_version int NOT NULL DEFAULT 1` — naik bila T&C diubah, paksa user setujui ulang.

Tambah ke `profiles`:
- `referral_terms_accepted_at timestamptz` — kapan user setuju.
- `referral_terms_version int` — versi T&C yang disetujui user.

Tidak mengubah `referral_balances`/`referral_commissions` (tetap Rp).

## Admin UI — `src/components/admin/keuangan/ReferralManager.tsx`
Tab **Pengaturan**:
- Tambah field **Nilai 1 Poin (Rp)** (numeric, default 2500) di grid setting.
- Tambah **Textarea "Syarat & Ketentuan Program Referral"** + checkbox "Naikkan versi (paksa user setujui ulang)".
- `saveSettings` ikut menyimpan `point_value_rp`, `terms_text`, dan increment `terms_version` bila checkbox dicentang.

## User UI — `src/pages/Referral.tsx`
- State `settings` ikut load `point_value_rp`, `terms_text`, `terms_version`. Profile ikut load `referral_terms_accepted_at`, `referral_terms_version`.
- Helper baru:
  ```ts
  const rpToPts = (rp:number)=> Math.floor(Number(rp||0)/Number(settings.point_value_rp||2500));
  const ptsToRp = (p:number)=> Math.round(Number(p||0)*Number(settings.point_value_rp||2500));
  const formatPts = (p:number)=> `${p.toLocaleString("id-ID")} poin`;
  ```
- **Hero info card**: tampilkan rate "1 poin = Rp {point_value_rp}".
- **Grid kartu saldo** (4 kartu) → ganti label/value:
  - Saldo Tersedia → **Poin Tersedia** = `formatPts(rpToPts(available_balance))`
  - Total Diterima → **Total Poin Didapat** dari `total_earned`
  - Sudah Cair → **Poin Sudah Cair** dari `total_withdrawn`
  - Referee → tetap.
- **Tombol Tarik Tunai**: disable bila `rpToPts(available_balance) < rpToPts(min_withdraw)`. Dialog: input **Nominal Poin**, tampilkan ekuivalen Rp realtime; saat submit kirim `_amount = ptsToRp(input)`.
- **Tombol Tukar Voucher**: dialog input poin → konversi Rp lalu RPC `convert_referral_to_voucher`.
- **Riwayat (komisi/withdrawal/voucher)**: nilai utama dirender dalam poin, sub-line kecil "≈ Rp …".

## Modal Persetujuan T&C
Komponen baru `src/components/referral/ReferralTermsDialog.tsx`:
- Tampil otomatis saat `profile.referral_terms_accepted_at == null` ATAU `profile.referral_terms_version < settings.terms_version`.
- Render isi `settings.terms_text` (whitespace-pre-wrap). Default fallback teks ringkas (3-4 poin) bila admin belum mengisi.
- Checkbox "Saya membaca & menyetujui Syarat & Ketentuan Program Referral".
- Tombol **Setuju & Lanjutkan** → update `profiles { referral_terms_accepted_at: now(), referral_terms_version: settings.terms_version }`. Tombol **Batal** → `navigate("/")`.
- Selama belum setuju: tombol Tarik Tunai, Tukar Voucher, dan Bagikan WA di-disable + klik buka dialog T&C.
- Tambah link kecil "Lihat Syarat & Ketentuan" di bawah hero card untuk membuka dialog kapan saja (read-only mode).

## Out of scope
- Tidak mengubah perhitungan komisi backend (tetap Rp).
- Tidak migrasi data komisi/voucher lama ke poin.
- Tidak mengubah halaman admin selain tab Pengaturan.
