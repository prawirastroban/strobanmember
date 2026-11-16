# SKILL: Glisses - Liquid Glass Mercury Drop
# Target Platform: Lovable.dev (Tailwind CSS, React, Framer Motion)
# Version: 3.1 (Satin Clay + Specular Rim)
# Description: Enforces fluid, ultra-reflective, organic liquid glass UI aesthetics inspired by Aether CSS with dynamic mercury-like morphing shadows.

## 1. System Prompt Constraints (Always Apply)
- You MUST wrap all glass elements in high-performance rendering configurations.
- You MUST prioritize physical fluid dynamics over static blur.
- You MUST strictly use Tailwind CSS classes alongside raw styling for complex refractions where Tailwind falls short.

## 2. Tokenized Color & Property Palette
Define these variables within the Tailwind utility layer or inline styles:
- **Base Material:** `rgba(255, 255, 255, 0.04)` (Very low opacity to let colors pass through).
- **Specular Highlight Border:** `linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.3) 100%)`.
- **Mercury Core Shadow:** `0 20px 50px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -20px 40px rgba(0, 0, 0, 0.05)`.
- **Blur Density:** `backdrop-blur-[24px]` up to `backdrop-blur-[40px]`.

## 3. Structural Ruleset & Code Snippets

### A. The Card Material (Container Base)
Every time a container, card, or modal is requested under `/glisses`, use this exact wrapper:
```tsx
<div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all duration-500 hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.25),inset_0_4px_8px_rgba(255,255,255,0.5)]">
  {/* Specular Highlight Overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none mix-blend-overlay" />
  
  {/* Content goes here */}
</div>
```

### B. The Mercury Drop Effect (Fluid Organic Shapes)
To achieve the "tetesan merkuri" look, containers must feel fluid, not rigidly rectangular. 
- Use complex `border-radius` variables that organically shift.
- Standard morph shape: `rounded-[60%_40%_30%_70%_/_60%_30%_70%_40%]`.
- Animation: Infuse a subtle, continuous floating movement using keyframes or Framer Motion.

```tsx
// Example Framer Motion Fluid Drop
import { motion } from 'framer-motion';

export const MercuryDrop = ({ children }) => (
  <motion.div
    animate={{
      borderRadius: [
        "60% 40% 30% 70% / 60% 30% 70% 40%",
        "50% 60% 40% 60% / 40% 60% 50% 60%",
        "60% 40% 30% 70% / 60% 30% 70% 40%"
      ]
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className="bg-white/[0.06] border border-white/30 backdrop-blur-3xl shadow-[inset_0_10px_20px_rgba(255,255,255,0.4),0_20px_40px_rgba(0,0,0,0.1)] p-8 text-white"
  >
    {children}
  </motion.div>
);
```

### C. The Liquid Refraction Background
To make the glass pop, the background directly underneath MUST contain intense, vibrant organic shapes (blobs) that warp when looked at through the glass filter.
```tsx
{/* Dynamic Under-Blob */}
<div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-60 animate-pulse" />
<div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-3xl opacity-50" />
```

## 4. Execution Guardrails
1. **Never** use solid colors for buttons. Always use transparent gradients (`from-white/20 to-white/5`) with high inner shadows.
2. **Never** use pixel borders higher than `1px`. Keep them sharp, bright, and translucent (`border-white/20`).
3. Ensure text readability by embedding a very subtle text shadow or keeping text elements inside a tighter `bg-black/10` or `bg-white/10` nested element if contrast drops.

## 5. v3.1 Satin Liquid Glass (CURRENT DEFAULT — overrides older tokens)
Stroban default since v3.1. Font: `-apple-system, "SF Pro Display", "Plus Jakarta Sans", system-ui`.
- **Light surface:** `linear-gradient(180deg, rgba(255,255,255,.78), rgba(245,248,252,.62))`, `blur(20px) saturate(170%)`.
- **Dark surface:** `linear-gradient(180deg, rgba(36,39,48,.72), rgba(18,20,26,.82))`.
- **Specular rim:** 1px border white/65, top border 1.5px solid white (dark: white/40), bottom border black/6.
- **Bevel shadow:** `inset 0 2px 4px rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.04), 0 12px 28px -10px rgba(15,23,42,.16)`.
- **Dock:** `.lg-dock`; **active tab lens:** `.lg-lens` (primary-tinted gradient, white top rim, soft primary glow).
- **Cards/tiles:** applied globally via `.app-glass-page`, `.web-glass`, `.glisses-tile` in `src/index.css`.
- **Exceptions:** home search bar and member card stay solid white (`.home-solid`). Never change layout or icons when restyling.
