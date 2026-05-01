---
name: Service Catalog
description: Categories from service_categories table are the single source of truth, consumed via useServiceCategories hook
type: feature
---
**Single source of truth**: Table `public.service_categories` (slug, label, sort_order, is_active). Managed in Admin → Katalog Layanan → Kelola.

**Hook**: `src/hooks/useServiceCategories.ts` exposes `{ categories, loading, labelFor(slug) }`. Default `{ activeOnly: true }`. Includes a fallback list (maintenance/tires/electrical/ac/body/engine/detailing) so dropdowns never appear empty if the table is unreachable.

**Consumers (all dynamic, no hardcoded lists)**:
- `src/components/admin/ServiceManager.tsx` — service form Category dropdown.
- `src/components/admin/PromosManager.tsx` — `applicable_categories` chip selector.
- `src/components/admin/RewardsManager.tsx` — `applicable_categories` chip selector.
- `src/pages/Katalog.tsx` — derives filter chips from `services.category` distinct values; uses local `CATEGORY_LABELS` map for display fallback.

**Catalog page**: `src/pages/Katalog.tsx` (mobile-first, 2-col grid). Card = aspect-4/3 slideshow → bold red title → category subtitle → duration. Round (i) icon button (no text) at top-right opens center-modal zoom-in with bigger slideshow + 3 stat tiles + description + Booking CTA.

**Slideshow media**: `services.media_urls jsonb` = `[{url,type:"image"|"video"}]`. Component `src/components/catalog/ServiceMediaSlideshow.tsx` auto-rotates images every 3.5s, lets videos finish before advancing, dot indicators. Falls back to `services.image_url`.

**Admin media uploader**: ServiceManager has multi-upload (image+video, 25MB cap) into `service-images` bucket under `media/` prefix, with reorder (←/→) and delete.
