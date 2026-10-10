# Menu Sidebar "Pricelist" + Halaman Pricelist Baru

## Tujuan
Menambahkan tombol menu **Pricelist** di sidebar dashboard (kategori **Operasional**), yang membuka halaman baru `/dashboard/pricelist`. Untuk fase ini halaman masih **kosong (placeholder)** — sistem pricelist dengan import Excel menyusul di fase berikutnya.

## Akses
- Terlihat oleh **semua role dashboard** (admin, staff, admin cabang, mekanik) — TIDAK memakai `OwnerOnly` dan TIDAK memakai `requiredRole`.
- Catatan: role mekanik (`isSpkOnly`) hanya melihat menu SPK menurut filter sidebar yang sudah ada, jadi mereka tetap tidak melihat menu ini — sesuai perilaku yang berlaku.
- Rute sudah terlindungi otomatis karena berada di bawah `/dashboard/*` (`AdminRoute`), jadi konsumen biasa tidak bisa masuk.

## Implementasi

1. **Halaman baru** — `src/pages/Pricelist.tsx`
   - Halaman placeholder dengan empty state: ikon (lucide `ReceiptText`), judul "Pricelist", deskripsi singkat, dan keterangan bahwa daftar harga bisa di-update via import Excel (fitur menyusul).
   - Mengikuti pola halaman dashboard lain (loading/empty/error state sederhana sudah tercakup karena halaman statis).

2. **Route** — `src/pages/Admin.tsx`
   - Tambahkan: `<Route path="pricelist" element={<AdminLayout title="Pricelist" description="Daftar harga layanan"><PricelistPage /></AdminLayout>} />`
   - TANPA `OwnerOnly` di sekelilingnya.

3. **Menu sidebar** — `src/config/dashboardMenu.ts`
   - Tambahkan entry `{ title: "Pricelist", url: "/dashboard/pricelist", icon: ReceiptText, section: "operasional" }` (section di-set eksplisit karena inferensi otomatis tidak mengenali URL ini).
   - Tanpa `requiredRole` agar semua role dashboard melihatnya.

4. **Page Registry** — `src/config/pageRegistry.ts`
   - Tambahkan `{ path: "/dashboard/pricelist", title: "Pricelist", status: "ACTIVE", scope: "dashboard" }`.

5. **Breadcrumb** — `src/components/admin/drill/Breadcrumbs.tsx`
   - Tambahkan label segmen `pricelist: "Pricelist"`.

6. **Mobile Navigation** — tidak berubah (menu ini khusus dashboard; nav mobile pelanggan tidak tersentuh).

## Tidak Termasuk (Fase Berikutnya)
- Sistem pricelist sebenarnya: tabel data, import Excel, pencarian/filter, dan tampilan harga. Struktur halaman siap dikembangkan ke arah itu.

## Verifikasi
- Build bersih (`tsgo`).
- Uji di preview: menu "Pricelist" tampil di kategori Operasional, klik membuka `/dashboard/pricelist` dengan empty state, breadcrumb benar, dan URL langsung tidak mengarah ke halaman asing (tetap di dalam dashboard).
