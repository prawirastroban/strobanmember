## Masalah

`src/components/BranchLocations.tsx` (section "Cabang" di homepage) masih memakai array hardcoded berisi 4 cabang dengan alamat, telepon, WA, jam, dan gambar statis. Akibatnya, perubahan apa pun di `/dashboard/marketing` → BranchManager (tambah, edit, nonaktifkan, ganti gambar/alamat/telepon/WA/jam/link arah) tidak tampil di section ini, walau halaman `/cabang` sudah sinkron via tabel `branches`.

## Tujuan

Section "Cabang Kami" di homepage menampilkan data yang sama persis dengan yang ada di dashboard BranchManager — realtime saat admin menyimpan perubahan.

## Perubahan

### 1. `src/components/BranchLocations.tsx` — ambil dari tabel `branches`

- Hapus array `BRANCHES` hardcoded dan import gambar statis (`branch-bandung.jpg`, dll) kecuali dipakai sebagai fallback.
- Tambah state + `useEffect` (atau pakai pola yang sama seperti `src/pages/Cabang.tsx`) yang melakukan:
  ```ts
  supabase.from("branches")
    .select("id, slug, name, address, phone, whatsapp, hours, image_url, directions_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  ```
- Map hasil DB ke kartu yang sudah ada. Field mapping:
  - gambar → `image_url` (fallback: peta `slug → asset statis`, lalu `branch-bandung.jpg` sebagai default terakhir, mengikuti pola `Cabang.tsx`)
  - nama, alamat, jam, telepon, whatsapp, directions_url → langsung dari kolom
- Render kondisi:
  - Loading → spinner kecil di dalam section (tinggi minimal supaya layout tidak melompat).
  - Kosong → sembunyikan section atau tampilkan pesan singkat "Belum ada cabang aktif" agar tidak terlihat broken.
- Tombol Telepon / WhatsApp / Arah hanya dirender kalau field-nya ada (sama seperti `Cabang.tsx`).
- Tetap pakai grid 2/4 kolom, styling, ikon, dan animasi hover yang sekarang.

### 2. Realtime sinkronisasi (opsional, ringan)

Pakai realtime channel `branches` yang sama polanya seperti `useBranding`:
```ts
supabase.channel("branches-public")
  .on("postgres_changes", { event: "*", schema: "public", table: "branches" }, refetch)
  .subscribe();
```
Plus juga refetch kalau `invalidateBranchesCache()` dipanggil (boleh diabaikan kalau realtime sudah cukup).

### 3. Tidak diubah

- `src/pages/Cabang.tsx` (sudah sinkron).
- `src/components/admin/BranchManager.tsx` (sumber data) — tetap.
- Schema DB / RLS / storage / dependency.
- Gambar fallback `branch-*.jpg` tetap di `src/assets` agar slug lama yang belum upload gambar tidak putih.

## Verifikasi

1. Buka `/` dan catat tampilan section "Cabang Kami".
2. Di `/dashboard/marketing` → BranchManager, edit nama / alamat / upload gambar baru / toggle aktif salah satu cabang, lalu Save.
3. Kembali ke `/` (tanpa hard reload) — kartu cabang yang disunting harus berubah (kalau realtime aktif), atau berubah setelah refresh ringan.
4. Tambah cabang baru, pastikan muncul di homepage sesuai `sort_order`.
5. Nonaktifkan satu cabang, pastikan hilang dari homepage tapi data lama tetap aman.
