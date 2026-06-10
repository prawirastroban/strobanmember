## Tujuan
Pastikan menu Analytics tampil di sidebar Dashboard dan selesaikan masalah GA4 agar data traffic visitor muncul.

---

## Masalah yang Ditemukan

### 1. Secret GA4_SERVICE_ACCOUNT_JSON tidak valid
Edge function `ga4-analytics` mengembalikan error 500:
```
Unexpected token 'b', "bengkel-st"... is not valid JSON
```
Ini berarti secret `GA4_SERVICE_ACCOUNT_JSON` tidak berisi konten file JSON service account, melainkan string lain (kemungkinan nama file atau teks acak). Tanpa JSON yang valid, GA4 tidak bisa diakses.

### 2. Menu Web Analytics sudah ada di kode
Sudah terdaftar di `dashboardMenu.ts` dan route-nya ada di `Admin.tsx`, tapi perlu dipastikan muncul untuk user yang login.

---

## Rencana Perbaikan

### Langkah 1: Perbaiki Secret GA4 (butuh aksi user)
- Secret `GA4_SERVICE_ACCOUNT_JSON` harus diperbarui dengan **keseluruhan isi file JSON** service account yang di-download dari Google Cloud Console.
- Bukan hanya nama file atau sebagian, tapi seluruh teks JSON yang dimulai dengan `{"type": "service_account", ...}`.
- Setelah user menyediakan JSON yang benar, secret akan di-update.

### Langkah 2: Verifikasi Menu di Sidebar
- Menu "Web Analytics" (`/dashboard/analytics`) sudah ada di `dashboardMenu.ts` di bawah section "Laporan".
- Akses dibatasi untuk role "owner" (`requiredRole: "owner"`).
- Jika user login sebagai staff/owner, menu akan muncul otomatis.
- Tidak perlu menambah menu baru — menu sudah terdaftar. Hanya perlu memastikan tidak ada bug render yang menyembunyikannya.

### Langkah 3: Verifikasi Edge Function
- Setelah secret diperbaiki, edge function `ga4-analytics` akan bisa:
  - Parse JSON service account dengan benar.
  - Generate JWT dan dapatkan access token dari Google.
  - Query GA4 Data API untuk data visitor, session, page view, dsb.
- Dashboard akan menampilkan data GA4 di KPI card "Visitor (GA4)" dan section traffic.

### Langkah 4: Test End-to-End
- Buka `/dashboard/analytics`.
- Pastikan tidak ada error 500 dari edge function.
- Pastikan data GA4 (totalUsers, sessions, screenPageViews) muncul di dashboard.

---

## Yang Perlu Dari User
File JSON service account yang benar (hasil download dari Google Cloud Console → IAM & Admin → Service Accounts → Keys → Add Key → JSON). Copas seluruh isi file tersebut.