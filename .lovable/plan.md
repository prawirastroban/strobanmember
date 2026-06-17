## Fix RLS: izinkan role `staff` mengelola Pop-up Promo

**Akar masalah**
Policy `promo_popups` dan storage bucket `popup-images` saat ini hanya mengecek `has_role(auth.uid(), 'admin')`. Saat user dengan role `staff` mencoba upload/insert, RLS menolak → muncul `new row violates row-level security policy`.

**Perbaikan (migration baru)**
Drop & buat ulang policy berikut agar mengizinkan `admin` ATAU `staff`:

- `promo_popups`: SELECT all, INSERT, UPDATE, DELETE
- `promo_popup_events`: SELECT (untuk lihat analytics)
- `storage.objects` bucket `popup-images`: INSERT, UPDATE, DELETE

Predikat baru:
```sql
public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
```

Policy publik (anon view popup aktif, anon log event, public read gambar) tidak diubah.

**File**
- migration SQL baru di `supabase/migrations/`

Tidak ada perubahan kode frontend yang diperlukan.