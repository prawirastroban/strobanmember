## Tujuan
Hapus teks "Stroban Autocare" di samping logo navbar desktop, sehingga hanya logo gambar yang tampil.

## Perubahan
**`src/components/Navbar.tsx`** (line 251) — Hapus elemen `<span>` yang menampilkan `{brandName}`:
```tsx
<span className="hidden 2xl:inline max-w-[160px] truncate font-bold text-lg">{brandName}</span>
```

Logo gambar (line 250) dan atribut `alt={brandName}` tetap dipertahankan untuk aksesibilitas/SEO.

## Tidak diubah
- MobileNav, DesktopSidebar, Footer, dan komponen lain yang menampilkan brand name (tetap seperti semula).
- `useBranding` hook tetap dipakai untuk `logoLight` dan `alt`.
