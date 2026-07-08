# Fix: PWA Settings tidak flexible ke ujung layar

## Penyebab
Di `src/components/admin/PwaSettingsManager.tsx` baris 320, container utama memakai:

```tsx
<div className="space-y-6 max-w-4xl">
```

`max-w-4xl` (896px) mengunci lebar seluruh isi tab PWA & Install, sehingga kartu "Status Perangkat Ini", "Audit Push Notification", dan seksi lain di bawahnya tidak melebar mengikuti area konten di dashboard (yang jauh lebih lebar).

## Perubahan
1. Ganti `className="space-y-6 max-w-4xl"` menjadi `className="space-y-6 w-full"` pada root wrapper `PwaSettingsManager`.
2. Sisir wrapper turunan (jika ada `max-w-*` lain di dalam file yang membatasi kartu setelah baris 320) dan lepas juga agar semua kartu mengikuti lebar parent tab.
3. Grid statistik yang sudah pakai `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` dibiarkan — sudah responsif, hanya perlu container yang tidak dibatasi.

## Yang tidak diubah
- Tidak menyentuh logika data, hook, atau tombol.
- Tidak mengubah tab di `SystemManagementHub`.
- Tidak mengubah komponen `DeviceStat` atau kartu shadcn.
