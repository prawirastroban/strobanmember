## Tujuan
Tambah pengaturan **batas klaim per user** pada tiap promo: 1 user 1 klaim, atau 1 user boleh klaim beberapa kali (sampai N kali / unlimited).

## 1) Database (migration baru)
- Tambah kolom di `promos`:
  - `max_claims_per_user` integer NOT NULL DEFAULT `1` — batas klaim per user. Nilai `0` = unlimited per user. (`max_claims` existing tetap = total kuota global.)
- Update fungsi `public.claim_promo(_promo_id uuid)`:
  - Hitung jumlah klaim user untuk promo ini (`SELECT count(*) FROM promo_claims WHERE promo_id=_promo_id AND user_id=auth.uid()`).
  - Jika `max_claims_per_user > 0` dan `count >= max_claims_per_user` → return `{ success:false, error:'limit_per_user_reached' }`.
  - Jika `max_claims_per_user = 0` (unlimited) → lewati cek "already_claimed" lama.
  - Voucher code tetap di-generate unik per klaim (sudah unik via prefix + random).
- Backfill: semua promo existing default `1` (perilaku saat ini = 1x per user).

## 2) Admin UI — `PromosManager.tsx`
Form Edit/Create promo, tambah field di samping "Maks. Klaim (global)":
- Label: **Batas klaim per user**
- Pilihan radio/select:
  - `1 kali per user` (default)
  - `Beberapa kali` → muncul input angka `Jumlah maks per user` (kosong/0 = tak terbatas)
- Disimpan ke `max_claims_per_user`.

Di list row promo, tambah keterangan kecil di kolom "Klaim":
- "1×/user" atau "5×/user" atau "∞/user".

## 3) Customer UI — `Promo.tsx` & `MyVouchers.tsx`
- `Promo.tsx`:
  - Map `claims` saat ini menyimpan 1 klaim per promo (`Record<promo_id, MyClaim>`). Ubah jadi list (`Record<promo_id, MyClaim[]>`).
  - Tombol "Klaim" tetap aktif selama `claims[p.id].length < max_claims_per_user` (atau unlimited).
  - Jika sudah klaim ≥1 tapi masih boleh klaim lagi → tombol jadi "Klaim lagi" + secondary button "Lihat voucher saya".
  - Tampilkan label kecil di card: "Maks 3× per akun" jika > 1.
  - Handle error baru `limit_per_user_reached` → toast "Anda sudah mencapai batas klaim untuk promo ini".
- `MyVouchers.tsx` & `VoucherClaimCard.tsx` tetap menampilkan semua voucher milik user (tidak perlu perubahan logika, hanya pastikan multi-row per promo tampil).

## 4) Tipe & sinkronisasi
- `types.ts` auto-update via migration.
- Update interface `Promo` di `PromosManager.tsx` dan `Promo.tsx` menambah `max_claims_per_user: number`.

## Out-of-scope
- Cooldown antar klaim (mis. 1 klaim per minggu) — bisa ditambah nanti via kolom `claim_cooldown_hours`.
- Batas klaim per perangkat / IP.