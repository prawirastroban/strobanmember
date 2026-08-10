---
name: Setelan Thumbnail Katalog
description: Kolom thumbnail_* di services mengatur gambar kartu katalog; slideshow tetap dipakai di dialog detail
type: feature
---
Tabel `services` punya kolom `thumbnail_url`, `thumbnail_fit` (cover/contain/fill), `thumbnail_position` (center/top/bottom/left/right), `thumbnail_zoom` (0.8–1.6), `thumbnail_ratio` (1:1/4:3/3:4), `thumbnail_bg`.

Kartu daftar di `/katalog` memakai `ServiceThumbnail` bila `thumbnail_url` terisi; kalau kosong fallback ke `ServiceMediaSlideshow`. Dialog detail selalu memakai slideshow media penuh.

Helper: `src/lib/serviceThumbnail.ts`. Komponen: `src/components/catalog/ServiceThumbnail.tsx`. Panel admin "Thumbnail Katalog" di `ServiceManager.tsx` (upload ke bucket `service-images` prefix `thumbs/`, maks 2MB, disarankan 600×600 px).
