# Temuan utama

`Token Terdaftar` masih `0` karena jalur registrasi token web belum benar-benar jalan sampai tahap simpan token.

## Penyebab yang sudah terlihat dari audit

1. **Permission browser pada sesi yang terekam = `denied`**
   - Console snapshot berisi berulang kali: `[useWebPush] skip: permission= denied`
   - Artinya hook berhenti **sebelum** `initializeApp -> getMessaging -> getToken -> upsert push_tokens`
   - Dalam kondisi ini, token memang tidak akan pernah tersimpan.

2. **`push_tokens` dibuat dengan RLS tetapi tidak terlihat punya `GRANT` Data API**
   - Migrasi `20260209044645...` membuat tabel + policy, tapi tidak ada `GRANT SELECT/INSERT/...` untuk `authenticated` / `service_role`
   - Pada backend ini, **RLS saja tidak cukup**; tanpa `GRANT`, insert/select bisa gagal walau policy benar.
   - Jadi sekalipun permission sudah `granted`, penyimpanan token masih berpotensi gagal.

3. **Snapshot network tidak menunjukkan request `get_push_token_stats`**
   - Jadi angka `0` yang terlihat belum bisa dianggap bukti bahwa token memang sukses dihitung dari DB.
   - Bisa jadi page sedang fallback ke `0` karena RPC gagal / belum terpanggil di sesi itu.

## Dampak

- Semua event push berbasis Firebase untuk web/PWA bisa gagal dikirim karena tidak ada device token valid di `push_tokens`.
- Jalur pengiriman event di edge function masih bergantung pada isi tabel itu.

# Rencana implementasi

## Phase 1 — Perbaiki akses tabel token
- Tambahkan migration non-destruktif untuk memberi `GRANT` yang benar ke `push_tokens`
- Pastikan `authenticated` bisa `SELECT/INSERT/DELETE` sesuai policy yang sudah ada
- Pastikan `service_role` bisa akses penuh untuk dispatcher

## Phase 2 — Audit ulang registrasi token web end-to-end
- Validasi urutan ini tanpa ubah UI:
  - `initializeApp`
  - `getMessaging`
  - service worker register
  - `getToken`
  - save ke `push_tokens`
- Tambahkan logging yang lebih jelas hanya pada jalur teknis registrasi agar titik gagal terlihat pasti

## Phase 3 — Audit pembacaan counter di PWA Settings
- Cek apakah `get_push_token_stats()` benar-benar terpanggil di halaman settings
- Jika RPC gagal, tampilkan fallback teknis yang akurat di console agar tidak diam-diam terlihat `0`
- Tetap tanpa mengubah layout/UI

## Phase 4 — Validasi pengiriman event
- Setelah token tersimpan, uji event yang sudah Anda minta:
  - Booking Baru
  - Booking Dikonfirmasi
  - Customer Baru
  - Pembayaran Berhasil
  - Promo Digunakan
  - Referral Berhasil
- Verifikasi edge dispatcher membaca token yang tersimpan dan menerima respons FCM sukses

# Fitur yang terdampak

- Registrasi token web/PWA
- Counter token pada halaman PWA Settings
- Pengiriman push dari dispatcher ke perangkat web

# Yang tidak akan diubah

- UI
- URL
- Flow bisnis
- Permission bisnis user
- Struktur modul notifikasi yang sudah berjalan

# Detail teknis

```text
Permission granted
  -> firebase init
  -> messaging init
  -> firebase-messaging-sw register
  -> getToken(vapid)
  -> insert/upsert push_tokens
  -> get_push_token_stats membaca total > 0
  -> dispatch-notification kirim ke token tersebut
```

Implementasi ini non-destruktif dan fokus hanya pada akar masalah `token terdaftar = 0`.