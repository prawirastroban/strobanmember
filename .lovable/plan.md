## Tujuan
Pastikan section "Apa Kata Pelanggan Kami" (Testimonials) selalu berada di bawah, tepat **sebelum** section Cabang (BranchLocations).

## Perubahan
File: `src/pages/Index.tsx`

Urutan saat ini:
1. Hero / Mobile hero
2. **Testimonials** ← sekarang di sini
3. Stats / ServiceCatalog / WhyChooseUs / BranchLocations

Urutan baru:
1. Hero / Mobile hero
2. Stats / ServiceCatalog / WhyChooseUs (desktop, guest)
3. ServiceCatalog (desktop, user)
4. **Testimonials** ← dipindah ke sini (tampil di mobile & desktop)
5. **BranchLocations** (terakhir)

Implementasi:
- Hapus `<Testimonials />` dari posisi sekarang (line 45).
- Pindahkan `<BranchLocations />` keluar dari blok desktop-only sehingga muncul di mobile & desktop, ATAU biarkan struktur desktop/user block tetap tapi sisipkan `<Testimonials />` tepat sebelum `<BranchLocations />` di kedua cabang (guest & user), dan tambahkan juga `<Testimonials />` + `<BranchLocations />` versi mobile.

Pendekatan paling rapi: render `<Testimonials />` dan `<BranchLocations />` di luar blok kondisi (tampil semua viewport, semua user state), lalu hapus duplikatnya dari blok desktop/user.

Hasil akhir struktur:
```text
Navbar
Hero (desktop) / Mobile homepage stack
[guest only desktop]: Stats + ServiceCatalog + WhyChooseUs
[user only desktop]: ServiceCatalog
Testimonials
BranchLocations
Footer
```
