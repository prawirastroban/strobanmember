## Masalah

Error "Could not find the 'default_ringtone' column of 'pwa_settings' in the schema cache" muncul karena tabel `pwa_settings` di database hanya punya 7 kolom lama (id, banner_*, delay_seconds, reprompt_days, updated_at), sedangkan kode (`usePwaSettings`, `PwaSettingsManager`, `useNotificationPrefs`) sudah memakai 5 kolom notifikasi baru yang belum pernah dibuat:

- `notification_enabled` (bool)
- `notification_icon_url` (text)
- `notification_sound_url` (text)
- `default_ringtone` (text)
- `default_vibrate` (bool)

## Rencana Perbaikan

**1 migrasi database** — tambahkan 5 kolom yang hilang ke `public.pwa_settings` dengan default yang aman:

```sql
ALTER TABLE public.pwa_settings
  ADD COLUMN IF NOT EXISTS notification_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_icon_url text,
  ADD COLUMN IF NOT EXISTS notification_sound_url text,
  ADD COLUMN IF NOT EXISTS default_ringtone      text    NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS default_vibrate       boolean NOT NULL DEFAULT true;
```

RLS, GRANT, dan policy yang sudah ada di `pwa_settings` tidak diubah — hanya menambah kolom.

## Hasil

- Tombol **Simpan Pengaturan** di `/dashboard/pwa-settings` tidak akan error lagi di iPhone (atau perangkat manapun).
- Setelan ringtone/getar global tersimpan dan diteruskan ke service worker seperti yang sudah dirancang.
- Tidak ada perubahan kode frontend yang diperlukan.