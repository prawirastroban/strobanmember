## Masalah
Di perangkat mobile, **Pop-up Promo** tidak muncul karena bertabrakan dengan dua overlay lain yang dirender bersamaan:

1. `WhatsAppRequiredGate` — Radix `Dialog` modal yang muncul otomatis bila user belum mengisi nomor WA. Karena modal ini `open` tanpa delay dan mengunci body scroll (`data-scroll-locked`), Radix menutup / mencegah dialog promo (yang baru dibuka 1.2 detik kemudian) tampil di atasnya.
2. `CookieConsentBanner` — banner fixed yang langsung muncul saat `cookie_consent` belum ada, menutupi area bawah pop-up promo di layar kecil.

Selain itu dua `Dialog` Radix aktif sekaligus pada mobile sering menyebabkan salah satu ter-dismiss otomatis (focus trap & pointer-events konflik).

## Solusi: Antrian prioritas overlay
Urutan yang akan diberlakukan secara global:

```text
1. Promo Pop-up        (prioritas tertinggi)
2. WhatsApp Gate       (muncul setelah promo ditutup / tidak ada promo)
3. Cookie Consent      (muncul paling akhir)
```

Hanya **satu overlay aktif pada satu waktu**.

### Implementasi
Buat koordinator ringan via React Context: `src/contexts/OverlayQueueContext.tsx`
- Menyimpan state: `activeOverlay: "promo" | "wa" | "cookie" | null`
- API: `request(name)` & `release(name)` — komponen mendaftar saat siap tampil, koordinator memilih yang prioritasnya tertinggi.
- Urutan prioritas: `promo > wa > cookie`.

### Perubahan komponen
- **`PromoPopupManager.tsx`**: panggil `request("promo")` saat ada popup yang siap; render `Dialog` hanya bila `activeOverlay === "promo"`. Saat ditutup → `release("promo")`. Jika tidak ada popup yang lolos filter, langsung `release` agar antrian lanjut.
- **`WhatsAppRequiredGate.tsx`**: tetap cek `isMissing`, tapi hanya buka Dialog ketika `activeOverlay === "wa"`. Request "wa" dilakukan setelah loading selesai & promo melepas slot.
- **`CookieConsentBanner.tsx`**: hanya render banner bila `activeOverlay === "cookie"`. Request "cookie" dilakukan saat `cookie_consent` belum ada & overlay lain sudah selesai.
- **`src/App.tsx`**: bungkus tree dengan `<OverlayQueueProvider>` (di dalam provider lain yang sudah ada).

### Perbaikan tambahan untuk mobile
- Tambahkan `data-mobile-safe` padding di `PromoPopupDialog` (`max-w-[92vw]` + `mx-auto`) agar tidak terpotong viewport.
- Hapus delay 1.2 detik di `usePromoPopups` menjadi 400 ms supaya kandidat siap sebelum WA gate menyalakan modal-nya (tetap setelah LCP).
- Promo pop-up tetap menghormati filter audience / display_pages / frequency yang sudah ada (tidak ada perubahan logika promo).

### Tidak diubah
- Skema database, RLS, dan logika tracking event promo (impression / cta_click / dismiss) tetap sama.
- Logika WA gate (validasi nomor, sign-out) tetap sama.
- Logika cookie consent / GA4 loading tetap sama.

## Hasil yang diharapkan
- Di mobile maupun desktop, jika ada promo aktif → Pop-up Promo muncul lebih dulu.
- Setelah ditutup, baru WA gate muncul (jika user belum isi nomor).
- Setelah keduanya selesai, banner cookies baru tampil.
- Tidak ada lagi tumpang-tindih dua Dialog modal di mobile.