## Masalah

Tombol **Konfirmasi** di card booking tidak berfungsi untuk admin cabang. Akar masalah ada di function `public.confirm_booking`:

```
IF v_paid NOT IN ('paid', 'pay_later') THEN
  RETURN ... 'Booking belum dibayar (payment_status: ...)';
END IF;
```

Booking yang ditest (`0d8f5215…`) punya `payment_status = 'pending'`, sehingga RPC menolak walau role admin_cabang sudah diizinkan. Authorization sudah benar (admin / staff / admin_cabang), yang menghalangi hanya guard pembayaran.

Sesuai instruksi user: *"fungsi konfirmasi hanya merubah status dari pesanan bookingan yang sudah dibuat lalu statusnya konfirmasi"* — tombol Konfirmasi cukup mengubah status booking → `confirmed`, tanpa syarat pembayaran.

## Rencana Migrasi (DB-only, tanpa ubah UI)

Update function `public.confirm_booking`:

1. Pertahankan auth guard: `admin` OR `staff` OR `admin_cabang`.
2. **Hapus** guard `payment_status` (tidak lagi memblokir kalau `pending`).
3. Pertahankan guard transisi status: hanya boleh dari `waiting_confirmation` atau `pending` (agar tidak bisa "mengkonfirmasi" booking yang sudah `in_progress` / `completed` / `cancelled`).
4. Set `status = 'confirmed'`, `service_status = 'confirmed'`, `updated_at = now()`.
5. Return `{ success: true }`.

Tidak ada perubahan pada tabel, RLS lain, frontend, atau edge function. Trigger notifikasi yang sudah ada akan otomatis terpanggil saat status berubah ke `confirmed`.

## Efek Samping

- CS pusat (`admin`) & owner (`staff`) juga ikut bisa Konfirmasi tanpa menunggu pembayaran — konsisten dengan permintaan "rule admin cabang dan CS pusat sama-sama bisa".
- Tombol "Konfirmasi Lunas" di PaymentsManager tidak terdampak (pakai RPC pembayaran berbeda).
