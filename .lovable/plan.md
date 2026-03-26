

## Plan: Update Hero for trustworthy look and remove "GRATIS" badge

### Changes

1. **Update `src/components/Hero.tsx`**
   - Change the hero background overlay from bright red (`from-primary/95 to-primary/60`) to a deep navy/dark blue gradient (`from-[#1a2332]/95 to-[#2c3e50]/80`) — conveys professionalism and trust
   - Remove the "👉 GRATIS pengecekan kendaraan hari ini" badge entirely (lines 35-39)

### Technical details
- Replace line 20: `bg-gradient-to-r from-primary/95 to-primary/60` → `bg-gradient-to-r from-[#1a2332]/95 to-[#2c3e50]/80`
- Replace line 21: remove the red radial gradient overlay, replace with a subtle blue tint: `bg-[radial-gradient(ellipse_at_top_right,hsl(210_50%_40%/0.3)_0%,transparent_60%)]`
- Delete lines 35-39 (the GRATIS badge block)

