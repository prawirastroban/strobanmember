## Akar Masalah

Trigger DB `notify_staff_new_registration` (yang jalan setelah `INSERT` ke `public.profiles`) merujuk ke `NEW.email`, padahal tabel `profiles` tidak punya kolom `email`. Akibatnya:

```
ERROR: record "new" has no field "email" (SQLSTATE 42703)
500: Database error saving new user
```

Ini muncul di **setiap** pembuatan user baru — termasuk:
- Signup user biasa (email, WA, Google) → muncul 500 di endpoint `/signup`.
- Edge function `admin-user-ops` action `create_customer` yang dipakai Quick Booking (Owner/CS/Admin) → gagal karena `admin.createUser` di sisi auth juga melempar error yang sama.

Jadi **dua keluhan user disebabkan oleh satu bug yang sama**, bukan masalah RLS atau role.

## Perbaikan

Migration kecil yang **hanya** memperbaiki function `notify_staff_new_registration`:

1. Hilangkan referensi `NEW.email`.
2. Ambil email dari `auth.users` berdasarkan `NEW.id` (lalu skip kalau itu synthetic phone email `*@phone.bengkelstroban.com` agar pesan tetap rapi).
3. Bungkus dengan `EXCEPTION WHEN OTHERS THEN RAISE WARNING ... ; RETURN NEW;` agar kegagalan notifikasi staff tidak pernah lagi memblokir signup di masa depan (defensive — pola yang sama sudah dipakai di `fire_dispatch_notification`).

Tidak ada perubahan skema, tidak ada perubahan RLS, tidak ada perubahan kode frontend. Quick Booking add-customer akan langsung jalan kembali begitu trigger diperbaiki.

## Verifikasi setelah migration

- Coba signup baru di `/auth` (email + WA) → tidak ada lagi 500.
- Coba Quick Booking (login sebagai Owner/CS/Admin) → tambah customer baru sukses.
- Cek log auth Supabase: tidak ada lagi `record "new" has no field "email"`.
