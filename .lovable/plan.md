## Masalah
Footer (`src/components/Footer.tsx` baris 41) pakai `bg-foreground text-background`. Pada dark mode, `bg-foreground` = warna terang → background footer jadi putih. Logo `logoDark` (versi putih untuk background gelap) jadi tidak terlihat di atas putih.

Sesuai permintaan: render logo Stroban dalam **warna merah brand `#ff2b2b`** supaya kontras di dark mode (background putih) maupun light mode (background hitam — masih terlihat).

## Perbaikan

Ubah `<img>` logo di `src/components/Footer.tsx` baris 47–49 jadi elemen `<div>` yang memakai CSS **mask-image** dari URL `logoDark`, dengan `background-color: #ff2b2b`. Hasilnya: bentuk logo persis sama, tapi diwarnai merah penuh — independen dari warna sumber gambar.

```tsx
<div
  role="img"
  aria-label={brandName}
  className="h-8 w-32"
  style={{
    backgroundColor: "#ff2b2b",
    WebkitMaskImage: `url(${logoDark})`,
    maskImage: `url(${logoDark})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "left center",
    maskPosition: "left center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  }}
/>
```

Tambah juga sedikit glow halus (`drop-shadow`) opsional via `filter` agar match estetika red-neon brand — tapi minor, hanya jika tetap clean.

Sekaligus tutup laporan internal **"warna logo stroban mode dark"** (status `open` → `fixed`) setelah perubahan applied.

## Yang TIDAK diubah
- Tidak menyentuh `useBranding`, asset logo, atau Navbar.
- Tidak menambah varian logo baru di DB.
- Tidak refactor struktur Footer.

## Estimasi
1 file diedit (~10 baris), 1 update row `internal_reports`. Tidak perlu migrasi DB.
