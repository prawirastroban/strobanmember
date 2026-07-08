
## Diagnosis

Saat menekan **Publish Versi**:
1. `app_settings.app_version` ter-upsert dengan `release_notes` → ini SUKSES (terlihat di DB: version 3.0.3, notes "Maintenance").
2. Baris di `app_releases` (yang dipakai `UpdateCenter` dan `Version Registry` untuk menampilkan release notes) TIDAK terbentuk untuk 3.0.3 — hilang.

Akar masalah: RLS `app_releases`
```
INSERT/UPDATE: has_role(auth.uid(), 'staff')
```
Hanya role `staff` yang diizinkan. Publisher biasanya `admin` / `admin_cabang`, sehingga insert/update ditolak diam-diam. Kode di `AppVersionManager.tsx` (lines 138–171) tidak menangkap error dari `.insert()` / `.update()`, jadi toast tetap "Versi dipublikasikan" padahal baris rilis gagal disimpan → release notes "tidak tercatat".

## Perbaikan

### 1. Migration — perluas RLS `app_releases`
Ganti policy INSERT/UPDATE/DELETE agar mengizinkan role admin juga (siapa saja yang boleh mengelola versi aplikasi). Policy SELECT tetap.

```sql
DROP POLICY IF EXISTS "Owner can insert releases" ON public.app_releases;
DROP POLICY IF EXISTS "Owner can update releases" ON public.app_releases;
DROP POLICY IF EXISTS "Owner can delete releases" ON public.app_releases;

CREATE POLICY "Admins can insert releases" ON public.app_releases
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE POLICY "Admins can update releases" ON public.app_releases
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE POLICY "Admins can delete releases" ON public.app_releases
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));
```

Backfill baris hilang untuk versi terbaru yang sudah live di `app_settings` tetapi belum tercatat di `app_releases` (mis. 3.0.3) menggunakan data dari `app_settings.app_version`.

### 2. `src/components/admin/AppVersionManager.tsx`
Verifikasi eksplisit di fungsi `save(true)`:
- Tangkap `error` dari `.insert()` dan `.update()` ke `app_releases`; jika error → `throw` agar toast "Gagal menyimpan" muncul, bukan false success.
- Set `released_at: now` eksplisit pada insert & update (bukan hanya default column) supaya "Release Date" di Version Registry ikut update saat re-publish versi yang sama.
- Set `title: notes ? notes.split('\n')[0].slice(0, 120) : null` agar `UpdateCenter` bisa menampilkan judul.
- Setelah sukses, lakukan `select().eq('version', latest).maybeSingle()` untuk verifikasi bahwa baris benar-benar ada; kalau kosong → tampilkan error "Release row tidak terbaca setelah publish (RLS?)".

### 3. Verifikasi
- Buka `/dashboard/system-management?tab=deployment`, isi Catatan Rilis, klik **Publish Versi** → toast sukses.
- Query `app_releases` → baris untuk versi tersebut ada dengan `summary` = notes.
- Buka `/update-center` → catatan rilis muncul.
- Coba tanpa isi notes → tetap sukses, `summary = null`.

## Files
- `supabase/migrations/<ts>_fix_app_releases_admin_rls.sql` (new)
- `src/components/admin/AppVersionManager.tsx` (edit `save()`)
