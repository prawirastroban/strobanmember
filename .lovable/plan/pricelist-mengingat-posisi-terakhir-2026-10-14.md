# Pricelist mengingat posisi terakhir

## Yang akan berubah untuk pengguna
Saat pindah aplikasi, mengunci HP, me-refresh halaman, atau membuka menu lain lalu kembali ke Pricelist, halaman kembali persis seperti terakhir ditinggalkan:
- Tab terakhir (Ban / Oli / Spareparts / Jasa, termasuk pilihan Service | Ban di Jasa)
- Teks pencarian terakhir
- Filter yang dipilih dan grup filter yang sedang terbuka
- Jumlah baris yang sudah dimuat ("muat lebih banyak")
- Posisi scroll terakhir

Setiap tab menyimpan pencarian & filternya sendiri, jadi berpindah Ban -> Oli -> Ban tidak menghapus pencarian Ban. Tombol Reset di filter dan tombol x di search bar tetap menghapus secara manual. Data disimpan di perangkat masing-masing (per akun), tidak dikirim ke server.

## Detail teknis
- Hook baru `usePricelistMemory` di `src/hooks/`: state `{category, subJasa, perCat: {q, filters, openMap, limit}}` disimpan ke `localStorage` key `pricelist:state:v1:<userId>` (debounce 300ms, juga saat `visibilitychange` hidden / `pagehide`).
- `Pricelist.tsx`: ganti `useState` category/q/filters/openMap/limit dengan hook; handler ganti tab tidak lagi mengosongkan q/filters, hanya memuat state milik tab tujuan dan scroll ke atas.
- Posisi scroll: simpan `window.scrollY` per tab di `sessionStorage` + localStorage saat scroll (throttle) dan hidden; restore setelah data item selesai dimuat (requestAnimationFrame), supaya ScrollManager tidak menimpa ke 0.
- Validasi saat load (try/catch, nilai tidak valid -> default) agar data lama/rusak tidak membuat halaman error.
- Verifikasi Playwright: search + filter + scroll, reload, pastikan semua kembali; ganti tab bolak-balik.
