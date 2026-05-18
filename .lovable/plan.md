# Verifikasi Google Search Console — Metode HTML File Upload

Anda upload file verifikasi `googlec1d3a61c4090878a.html` dari Google Search Console. Metode ini butuh file tersebut bisa diakses publik di:

```
https://www.bengkelstroban.com/googlec1d3a61c4090878a.html
```

## Yang akan saya lakukan

1. **Copy file ke `public/googlec1d3a61c4090878a.html`**
   - Vite serve folder `public/` apa adanya sebagai static asset di root domain.
   - File akan otomatis di-deploy saat publish.

2. **Verifikasi tidak ada konflik routing**
   - SPA fallback (`/* → index.html`) hanya berlaku untuk path yang tidak punya file. Karena `public/googlec1d3a61c4090878a.html` ada, request `/googlec1d3a61c4090878a.html` akan return file mentah — bukan React app.

## Setelah implementasi

1. Saya akan minta Anda **Publish** project agar file live di domain produksi.
2. Buka URL untuk cek manual: `https://www.bengkelstroban.com/googlec1d3a61c4090878a.html` → harus tampil teks `google-site-verification: googlec1d3a61c4090878a.html`
3. Kembali ke Google Search Console → klik **Verify**.

## Catatan penting

- Metode HTML file ini hanya valid untuk property type **"URL prefix"** (mis. `https://www.bengkelstroban.com`), **bukan** "Domain" property. Pastikan Anda pilih URL prefix di Search Console.
- Untuk juga cover `https://bengkelstroban.com` (tanpa www) dan domain Lovable preview, tambahkan sebagai URL prefix property terpisah. Token meta tag yang sudah ada di `index.html` (`D43MM2Vr...`) tetap berlaku untuk verifikasi tambahan tersebut.
- Meta tag lama di `index.html` tidak perlu dihapus — Google membolehkan beberapa metode verifikasi aktif sekaligus.

## File yang diubah

- **Baru**: `public/googlec1d3a61c4090878a.html` (copy dari upload)

Setujui untuk lanjut implementasi?
