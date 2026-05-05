## Tujuan

Tile pada section "Layanan" di hero homepage hanya menampilkan **kategori** (bukan layanan individu). Klik tile → buka sheet berisi semua layanan dalam kategori tersebut. Sumber kebenaran 100% dari Dashboard → Marketing → Service Categories & Services.

## Aturan

- Marketing tambah **kategori baru** di `service_categories` → tile baru muncul di hero (urut `sort_order`, hanya `is_active=true`).
- Marketing tambah **layanan baru** dengan `category=<slug>` → otomatis masuk daftar di sheet kategori itu.
- Mode "pinned per service" (`show_on_home`) **dihapus** dari grid hero. Tile selalu = kategori.

## Perubahan

**A. `src/components/mobile/home/ServiceCategoryGrid.tsx`**
1. Hapus blok `pinnedServices` / `pinnedTiles` / `usePinned` — tile tidak lagi dibangun dari `services.show_on_home`.
2. Ambil daftar kategori langsung dari `useServiceCategories()` (sudah `is_active` only + realtime). Loop kategori tersebut → join dengan `services` per `category` slug.
3. `categories` dibangun dari `useServiceCategories()` order by `sort_order`, bukan dari `Object.keys(CATEGORY_STYLE)`. Untuk tiap kategori:
   - `label` = `cat.label` dari DB
   - `services` = `services.filter(s => s.category === cat.value)`
   - `iconValue` = icon service pertama dalam grup, fallback `"Wrench"`
   - `gradient/color/description` = `CATEGORY_STYLE[slug] || DEFAULT_STYLE` (visual default; tidak menyimpan label apapun)
4. Tetap show 7 tile pertama + tombol "Lainnya" → `/katalog`. Skeleton tetap.
5. Sheet detail tidak berubah (sudah list `activeCategory.services`). Auto-select layanan jika hanya 1 dipertahankan.

**B. `ServiceManager.tsx`** (opsional, kebersihan UI)
- Tidak wajib diubah. Field `show_on_home`/`home_sort_order`/`home_color` boleh tetap ada di DB untuk kompat, hanya tidak lagi dipakai oleh grid hero. Jika ingin bersih, sembunyikan/hapus toggle "Tampilkan di Homepage" dari form Service nanti — di luar scope perubahan ini.

## Hasil

- Tile hero = kategori aktif dari DB, realtime sync (channel `service-categories-sync` sudah ada).
- Tambah kategori di dashboard → muncul tile baru tanpa reload.
- Tambah layanan di kategori X → muncul di sheet kategori X tanpa reload (channel `services-home-grid` sudah ada).
