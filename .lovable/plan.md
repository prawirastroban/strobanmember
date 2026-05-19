# Verifikasi Domain via Google Search Console API

Meta tag verifikasi sudah terpasang di `index.html`:
```html
<meta name="google-site-verification" content="D43MM2Vrect58Jm_Yq8FrAsC_t2JyWET-OpZpV4hE18" />
```

Karena `index.html` di-serve di root maupun subdomain `www`, kedua domain bisa diverifikasi dengan method `META` tanpa perlu mengubah DNS sama sekali.

## Langkah Implementasi

1. **Hubungkan Google Search Console connector**
   - Memanggil `standard_connectors--connect` dengan `connector_id: google_search_console`.
   - User akan diminta otorisasi akun Google yang punya akses ke Search Console.

2. **Verifikasi `https://bengkelstroban.com/`**
   - `POST /siteVerification/v1/webResource?verificationMethod=META` dengan identifier root.
   - Google akan fetch halaman & memeriksa meta tag yang sudah ada.

3. **Verifikasi `https://www.bengkelstroban.com/`**
   - Sama seperti langkah 2 dengan identifier `www`.

4. **Daftarkan kedua site ke Search Console**
   - `PUT /webmasters/v3/sites/{encoded-url}` untuk root.
   - `PUT /webmasters/v3/sites/{encoded-url}` untuk www.

5. **Verifikasi hasil**
   - `GET /webmasters/v3/sites` untuk memastikan kedua property muncul.

## Catatan Teknis

- Tidak ada perubahan code/file di proyek — meta tag yang dibutuhkan sudah ada.
- Semua langkah dijalankan via `code--exec` + curl ke connector gateway `https://connector-gateway.lovable.dev/google_search_console/...`.
- Token verifikasi Google (`D43MM2Vrect58Jm_Yq8FrAsC_t2JyWET-OpZpV4hE18`) sudah konsisten dengan yang akan divalidasi.
- Jika Google gagal fetch meta tag (mis. site belum di-publish ulang), saya akan minta user untuk publish dulu lalu retry.

## Yang TIDAK Dilakukan

- Tidak menambah TXT record DNS (tidak diperlukan untuk method META).
- Tidak mengubah `index.html` (meta tag sudah benar).
- Tidak membuat halaman admin DNS management (sesuai pilihan user: verifikasi otomatis via API).
