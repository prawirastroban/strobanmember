## Masalah

1. **Cabang terdekat salah** — J-Station selalu kalah dengan Stroban Express karena koordinat J-Station di DB hanya placeholder `-7.3, 108.22` (sama persis dengan Tasikmalaya pusat). Express punya koordinat presisi `-7.3274, 108.2218` sehingga selalu "menang" dari titik mana pun di area Tasikmalaya.
2. **Format link `maps.app.goo.gl/...`** sebenarnya sudah didukung (`resolve-maps-link` edge function), tapi UX-nya menyembunyikan input link di balik tombol "Atau tempel link Google Maps", dan placeholder masih menampilkan format URL panjang sehingga user mengira format pendek tidak didukung.

## Perubahan

### 1. Perbaiki koordinat cabang yang placeholder (data fix)

Buat migrasi yang meng-update koordinat presisi untuk:
- **Stroban Jstation Tasikmalaya** → koordinat asli J-Station (perlu link Maps dari Anda)
- **Stroban Tasikmalaya** → koordinat presisi alamat Jl. Ir. H. Juanda No.81
- **Stroban Kuningan**, **Yogyakarta** → naikkan presisi (saat ini 2–3 desimal)

> ⚠️ Saya butuh link Google Maps presisi untuk **J-Station Tasikmalaya** (mis. `https://maps.app.goo.gl/...`) supaya bisa di-resolve menjadi lat/lng dan disimpan. Setelah Anda berikan, migrasi langsung dijalankan.

### 2. Hardening pemilihan cabang terdekat

Di `src/lib/geoUtils.ts → findNearestBranch`:
- Tambahkan filter: cabang dengan koordinat "kasar" (hanya 1–2 desimal, mis. `.0`, `.10`, `.22`) dianggap **low-confidence** dan **didemot** — hanya dipilih jika tidak ada cabang presisi dalam radius `max_distance_km`.
- Logging dev: tampilkan jarak ke semua cabang di console saat resolusi link agar mudah audit kasus seperti ini ke depan.

### 3. UX link Maps pendek (`maps.app.goo.gl/...`)

Di `src/components/booking/PickupLocationSection.tsx`:
- Ganti placeholder input menjadi:  
  `https://maps.app.goo.gl/MaYwGnFJiJYioLFaA` (contoh format pendek)
- Tampilkan input link **selalu terlihat** (tanpa perlu toggle) — disandingkan dengan tombol GPS, dua opsi setara.
- Ubah label tombol toggle lama menjadi helper text: *"Tempel link share Google Maps (format pendek/panjang didukung)."*
- Auto-trim & auto-paste-detect: saat user paste link ke input, langsung trigger resolve tanpa harus klik "Pakai" (debounce 400 ms). Tetap sediakan tombol "Pakai" untuk fallback manual.
- Pesan error link disederhanakan: *"Link tidak dapat dibaca. Pastikan link diambil dari tombol Share di Google Maps."*

### 4. Verifikasi

Setelah migrasi dijalankan + kode di-deploy:
- Test paste `https://maps.app.goo.gl/MaYwGnFJiJYioLFaA` → cek edge function logs `resolve-maps-link` → konfirmasi koordinat yang dikembalikan.
- Test titik dekat J-Station → harus pilih J-Station, bukan Express.
- Test titik di pusat kota Tasikmalaya → harus pilih Tasikmalaya pusat.

## File yang disentuh

- **NEW** `supabase/migrations/<ts>_fix_branch_coords.sql` — update lat/lng cabang J-Station + tasikmalaya pusat + kuningan + yogyakarta
- `src/lib/geoUtils.ts` — demote low-precision branch coords di `findNearestBranch`
- `src/components/booking/PickupLocationSection.tsx` — UI link Maps selalu visible, placeholder pakai format pendek, auto-paste detect

## Pertanyaan untuk Anda

Sebelum saya jalankan migrasi, mohon kirim link Google Maps presisi (format apa pun, pendek/panjang) untuk lokasi asli cabang **Stroban J-Station Tasikmalaya**. Tanpa itu, koordinatnya akan tetap salah meski logika sudah diperbaiki.
