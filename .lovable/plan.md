## Tujuan

Saat user sudah memilih lebih dari 1 layanan (dari `/booking` atau `/katalog`) lalu meninggalkan halaman tanpa checkout, munculkan **floating button "Pesanan"** mengambang persis di atas bottom nav (mirip Gojek/Mixue di screenshot). Klik tombol → kembali ke `/booking` dengan semua layanan terpilih utuh.

## Perilaku yang diharapkan

1. Pilih layanan di `/katalog` (klik "Pilih layanan ini" pada dialog detail) atau di `/booking` → masuk ke "cart" global.
2. Cart bertahan lintas halaman (localStorage), termasuk saat user pindah ke `/`, `/promo`, `/cabang`, `/profile`, dst.
3. Floating pill muncul **hanya jika `cart.length >= 1`** dan **hanya di halaman selain `/booking`** (di booking sudah ada sticky bar sendiri) — sesuai pola "tidak jadi checkout".
4. Pill posisi: `fixed`, di atas BottomNav (mobile) / di kanan-bawah (desktop), z-index di bawah dialog tapi di atas konten.
5. Konten pill: jumlah layanan kiri ("2 layanan"), ringkasan nama kanan ("AC + Tune Up..."), total harga, ikon keranjang. Tap → `navigate('/booking')` dan otomatis re-select semua layanan.
6. Tombol "X" kecil untuk clear cart (konfirmasi via toast undo 5 detik).
7. Auto-clear cart setelah booking sukses (saat redirect ke `/booking/status/...`).

## Struktur perubahan

### 1. Cart Context baru — `src/contexts/CartContext.tsx`
- State: `items: { id, name, price, duration, category }[]`
- Actions: `addItem`, `removeItem`, `toggleItem`, `clear`, `has(id)`
- Persist ke `localStorage` key `stroban_service_cart_v1`, hydrate on mount
- Expose lewat `useCart()` hook
- Provider dipasang di `src/App.tsx` (di dalam `AuthProvider`)

### 2. Floating component baru — `src/components/FloatingCartPill.tsx`
- Render `null` kalau `items.length === 0` ATAU `pathname === '/booking'` ATAU pathname diawali `/booking/`/`/dashboard`/`/auth`/`/checkout`
- Style: liquid-glass dengan red neon glow `#ff2b2b` (sesuai memory Visual Identity), rounded-full pill, h-14, mx-3, posisi `fixed bottom-[68px]` (mobile, di atas BottomNav h-16) atau `bottom-6 right-6 max-w-sm` (desktop md:)
- Animasi: `slide-in-from-bottom` saat muncul, hover 1.03 scale
- Klik utama → `navigate('/booking?cart=1')`
- Klik X kecil → `clear()` + sonner toast dengan action "Urungkan" yang restore via snapshot

### 3. Integrasi di Katalog — `src/pages/Katalog.tsx`
- Tambah tombol kedua di dialog detail: **"Tambah ke Pesanan"** (selain "Booking Sekarang"). 
  - "Tambah ke Pesanan" → `cart.addItem(s)` + tutup dialog + toast "Layanan ditambahkan", **tidak** navigate (sehingga user bisa lanjut menambah).
  - "Booking Sekarang" → addItem + navigate `/booking?cart=1` (langsung).
- Indikator kecil di card jika `cart.has(s.id)` (badge "Di pesanan").

### 4. Integrasi di Booking — `src/pages/Booking.tsx`
- Saat mount, jika `searchParams.get('cart') === '1'` ATAU `selectedServiceIds` kosong dan `cart.items.length > 0`, sync `setSelectedServiceIds(cart.items.map(i => i.id))`.
- Setiap perubahan `selectedServiceIds` → mirror ke cart (`cart.setItems(selectedServices.map(...))`) jadi cart selalu sinkron dengan pilihan booking aktif.
- Setelah submit booking sukses (sebelum `navigate('/booking/status/...')`) → `cart.clear()`.

### 5. Mount FloatingCartPill — `src/App.tsx`
- Render `<FloatingCartPill />` setelah `<BottomNav />` agar selalu ada di semua route publik.

## Detail teknis singkat

```text
App
├── CartProvider (new)
│   ├── Routes...
│   ├── BottomNav
│   └── FloatingCartPill (new) — fixed, hidden on /booking*
└── ...

cart.items ⇄ localStorage
cart.items ⇄ Booking.selectedServiceIds (two-way sync)
Katalog dialog → cart.addItem
```

## Out of scope
- Tidak menambah halaman `/cart` terpisah; cart **adalah** representasi state Booking.
- Tidak mengubah flow checkout / pembayaran.
- Tidak mengubah BottomNav (cukup biarkan ada offset `bottom-[68px]` untuk pill).