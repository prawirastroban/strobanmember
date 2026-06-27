# App Icon & Splash Sources

Place the master assets here. `npm run android:icons` will generate every
`mipmap-*` density (mdpi → xxxhdpi), adaptive icon foreground/background,
and round/legacy icons into `android/app/src/main/res/`.

Required files:

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 | Full bleed master logo (used for legacy / Play Store) |
| `icon-foreground.png` | 1024×1024 | Adaptive icon foreground. Keep visual centered inside the inner 66% safe zone (≈ 672×672) — outer area is cropped by OEM masks. Transparent background. |
| `icon-background.png` | 1024×1024 | Adaptive icon background. Solid color or subtle pattern. For Stroban use `#FFFFFF` or `#D50000`. |
| `splash.png` *(optional)* | 2732×2732 | Splash master. Logo centered, transparent or `#D50000` background. |

## Workflow

```bash
# After dropping new PNGs into /resources
npm run android:icons
npx cap sync android
# Then open Android Studio → rebuild
```

## Notes

- The previous `android-icons.zip` artifact remains valid as a one-shot bundle
  if you prefer not to run the generator.
- `@capacitor/assets` requires the `/android` folder to exist locally
  (`npx cap add android`).