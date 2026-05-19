## Masalah

Link `https://maps.app.goo.gl/CEKzAwsWG7RM5TtC9?g_st=ic` setelah di-resolve oleh edge function `resolve-maps-link` mengarah ke:

```
https://www.google.com/maps?q=Jl.+Letnan+Harun,+Kab.+Tasikmalaya,+Jawa+Barat+46134&ftid=0x2e6f572d23bde725:0x2125f69a0df98a57&...
```

URL final ini **tidak memuat koordinat** (`@lat,lng` / `!3d!4d` / `q=lat,lng`) — hanya alamat teks (`q=`) + `ftid` (Feature ID Google). Body HTML Google Maps juga tidak lagi membocorkan koordinat di markup statis. Akibatnya resolver mengembalikan `coords not found` dan UI menampilkan toast merah.

## Solusi

Tambahkan **fallback forward-geocoding** di edge function: jika setelah redirect koordinat tetap tidak ditemukan, ambil alamat dari query `q=` (atau `query=`, atau dari `<title>` halaman) lalu geocode pakai Nominatim OpenStreetMap (sama seperti `reverseGeocode` di `src/lib/geoUtils.ts` — gratis, tanpa API key).

### Perubahan

**`supabase/functions/resolve-maps-link/index.ts`**
1. Tambah helper `extractAddressFromUrl(finalUrl)`:
   - Baca `URL(finalUrl).searchParams.get("q")` / `"query"` / `"destination"`.
   - Skip kalau nilainya cocok format lat,lng (sudah ditangani parser lama).
   - URL-decode & rapikan (`+` → spasi).
2. Tambah helper `extractAddressFromBody(html)` sebagai cadangan:
   - Ambil `<title>...</title>` lalu buang suffix `" - Google Maps"`.
3. Tambah helper `forwardGeocode(query)`:
   - `fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=id&q=" + encodeURIComponent(query))`
   - Header `User-Agent: "BengkelStrobanResolver/1.0 (support@bengkelstroban.com)"` (Nominatim wajib UA non-default).
   - Ambil hasil pertama → `{ lat: parseFloat(lat), lng: parseFloat(lon) }`.
4. Alur baru:
   - Coba `parseCoords(finalUrl)` → kalau ada, return.
   - Ambil body → coba `parseCoords(body)` & regex koordinat di body → kalau ada, return.
   - Ekstrak alamat (URL `q=` dulu, lalu `<title>` body) → kalau ada, `forwardGeocode` → kalau berhasil, return dengan `source: "geocoded"` dan `resolved_address` di payload.
   - Kalau semua gagal, balas `coords not found` (perilaku lama).
5. Pastikan body hanya dibaca satu kali (`await res.text()` disimpan ke variabel).

**`src/lib/resolveMapsLink.ts`** — tidak perlu diubah; tetap baca `lat`/`lng` dari payload. (Opsional kecil: log `resolved_address` di console untuk debug.)

**`src/components/booking/PickupLocationSection.tsx`** — tidak perlu diubah; cabang & jarak terdekat tetap dihitung lokal dari koordinat yang dikembalikan.

### Catatan teknis

- Nominatim rate limit ≈ 1 req/detik; resolver ini hanya dipanggil saat user klik "Pakai" jadi aman.
- Akurasi geocoding alamat Indonesia umumnya level jalan/kelurahan — cukup untuk menghitung biaya pickup berbasis km, dan user masih bisa edit jarak manual via tombol "edit".
- Tidak menyentuh schema DB, tidak butuh secret/connector baru.

### Verifikasi

Setelah deploy, panggil ulang edge function dengan URL contoh user lewat `curl_edge_functions` dan pastikan response berisi `success: true` + `lat`/`lng` di sekitar Tasikmalaya (~-7.35, 108.2).
