---
name: Service Catalog
description: Mobile catalog with media slideshow per service card and (i) zoom-in modal popup
type: feature
---
**Page**: `src/pages/Katalog.tsx` (mobile-first, 2-col grid).

**Card layout**: aspect-4/3 slideshow on top → bold red title → category subtitle → duration. Top-right "Info Lebih Lengkap" pill triggers center-modal zoom-in (animate-scale-in) showing larger slideshow + 3 stat tiles (Harga/Durasi/Rating) + full description + Booking CTA.

**Media**: `services.media_urls jsonb` = `[{url, type:"image"|"video"}]`. Component `src/components/catalog/ServiceMediaSlideshow.tsx` auto-rotates images every 3.5s, lets videos play through before advancing, dot indicators at bottom. Falls back to `services.image_url` if no media.

**Admin**: `ServiceManager.tsx` has multi-upload (image+video, 25MB cap) into `service-images` bucket under `media/` prefix, with reorder (←/→) + delete. Card body click → booking, (i) click → modal (stopPropagation).

