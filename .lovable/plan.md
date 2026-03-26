

## Plan: Add sticky top banner with operating hours

### What
Add a thin announcement banner above the navbar showing **"BUKA SETIAP HARI 08.00 - 17.00 di 6 cabang"** that stays fixed at the top of the page at all times.

### Changes

1. **Create `src/components/TopBanner.tsx`**
   - A fixed/sticky banner at the very top (`top-0, z-50`)
   - Yellow/secondary background with bold text
   - Text: "BUKA SETIAP HARI 08.00 - 17.00 di 6 cabang"
   - Small height (~32px), centered text

2. **Update `src/components/Navbar.tsx`**
   - Change `top-0` to `top-8` (offset by banner height) so navbar sits just below the banner
   - Keep navbar sticky

3. **Update `src/components/StickyBookButton.tsx`**
   - Adjust `top` offset to account for the new banner

4. **Update `src/pages/Index.tsx`**
   - Import and render `<TopBanner />` before `<Navbar />`

5. **Remove the "BUKA SETIAP HARI" line from `src/components/Hero.tsx`**
   - Since it's now in the top banner, remove the duplicate text from the hero section

### Technical details
- Banner: `fixed top-0 left-0 w-full z-50 bg-secondary text-secondary-foreground`
- Navbar: `sticky top-8 z-40` (below banner)
- StickyBookButton top adjusted from `top-[68px]` to `top-[100px]`

