---
name: Onboarding Pengguna Baru
description: Wizard 4 langkah untuk pengguna baru (welcome, WhatsApp, kendaraan, tur fitur) plus kartu checklist akun di homepage mobile.
type: feature
---
- Kolom `profiles.onboarding_completed_at` dan `profiles.onboarding_step` menyimpan status/progres.
- `useOnboarding` (src/hooks) menentukan `shouldShow` (hanya role customer, belum complete) dan menyediakan saveStep/complete/refresh.
- `OnboardingWizard` dipasang global di App.tsx; memakai `OverlayQueueContext` dengan prioritas `onboarding > promo > wa > cookie` agar tidak dobel dengan `WhatsAppRequiredGate`.
- Langkah: Welcome → WhatsApp (wajib, simpan `profiles.phone` +62) → Kendaraan (opsional, insert `vehicles`, is_default true) → Tur fitur.
- `AccountChecklistCard` tampil di homepage mobile jika phone/kendaraan belum lengkap.