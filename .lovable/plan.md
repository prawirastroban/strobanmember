## Masalah

Urutan tile di `ServiceCategoryGrid.tsx` saat ini pakai key salah:
`["maintenance", "tires", "oli", "oil", "promo"]`.

Tapi slug asli di database adalah:
- `maintenance` → Servis
- `tires` → Ban
- `paket-ganti-oli` → Oli
- `promo-spesial` → Promo

Karena `"oli"` dan `"promo"` tidak match slug manapun, sort tidak efektif → urutan jatuh ke `sort_order` DB (Servis, Ban, Promo, Oli).

## Perbaikan

Update array `PREFERRED_ORDER` di `src/components/mobile/home/ServiceCategoryGrid.tsx` menjadi slug asli:

```ts
const PREFERRED_ORDER = ["maintenance", "tires", "paket-ganti-oli", "promo-spesial"];
```

Hasil tampilan tile: **Servis → Ban → Oli → Promo**.

Verifikasi visual via Playwright screenshot homepage mobile setelah perubahan.