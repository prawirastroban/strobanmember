# Dashboard Sistem di System Management

## Jawaban singkat
Ya — panel ini sebaiknya dipicu langsung dari **event database** (insert/update di `bookings`, `payments`, `vehicles`, `profiles`, `tire_orders`), bukan dari fetch berkala saja. Tapi untuk menjaga performa & biaya Realtime tetap aman, kita pakai **pola hybrid**:

1. **Initial fetch** sekali saat tab dibuka (ringan, query agregat).
2. **Realtime postgres_changes** untuk 5 tabel sumber, dengan **debounce 1.5 dtk** → satu refetch agregat dipicu walau ada banyak event beruntun.
3. **Polling fallback tiap 60 dtk** (kalau koneksi realtime drop / tab idle).
4. **Channel di-unmount bersih** (`removeChannel`) supaya tidak ada subscription bocor.

Pola ini sudah dipakai di `useDashboardBadges` & `NeedAttention` — kita reuse pendekatannya.

## Scope
Tab baru **"Dashboard"** sebagai tab pertama di `SystemManagementHub`. Tidak mengubah tab lain.

## Konten KPI (live)
Tiga grup, satu baris kartu glass:

**Operasional Hari Ini**
- Booking baru hari ini (count `bookings` where `created_at::date = today`)
- Booking pending konfirmasi (status `pending` / `waiting_confirmation`)
- Booking aktif (in_progress, ready_for_pickup)
- Tire orders baru hari ini + pending payment

**Transaksi & Pembayaran**
- Pembayaran masuk hari ini (count + total Rp dari `payments` paid)
- Pending payments (jumlah + total Rp)
- Invoice terbit hari ini

**Akuisisi Customer**
- Customer baru hari ini (group by `acquisition_source`: google / email / whatsapp)
- Kendaraan baru hari ini
- Total customer aktif (verified)

Plus baris kecil **System Health**: total sesi online (dari `app_version_clients` last_seen < 5 mnt), client tertinggal versi, maintenance mode on/off.

## Technical

**File baru**
- `src/components/admin/system/SystemDashboardPanel.tsx` — UI kartu KPI + grup section, pakai design token (`bg-card/60 backdrop-blur-xl border-white/10`).
- `src/hooks/useSystemDashboardStats.ts` — load + subscribe + debounce + polling.

**File edit**
- `src/components/admin/system/SystemManagementHub.tsx` — tambah tab `dashboard` sebagai tab pertama dengan icon `LayoutDashboard`, default value `"dashboard"`.

**Hook outline** (`useSystemDashboardStats.ts`)
```text
- useEffect:
    - fetchAll() → Promise.all aggregat queries (head:true, count:exact)
    - debounce(fetchAll, 1500) sebagai `schedule`
    - channel = supabase.channel("system-dashboard")
        .on(postgres_changes, bookings)    → schedule()
        .on(postgres_changes, payments)    → schedule()
        .on(postgres_changes, profiles)    → schedule()
        .on(postgres_changes, vehicles)    → schedule()
        .on(postgres_changes, tire_orders) → schedule()
        .subscribe()
    - interval = setInterval(fetchAll, 60_000)
- cleanup: removeChannel + clearInterval + cancel debounce
```

**Realtime publication** — cek apakah 5 tabel sudah ada di `supabase_realtime` publication. Yang belum akan ditambahkan via migration kecil (ALTER PUBLICATION ADD TABLE). Tidak ada DB trigger baru, tidak ada perubahan RLS.

**RLS** — semua query agregat aman: dashboard panel hanya bisa diakses owner (sudah dilindungi sidebar entry `requiredRole: "owner"` + route guard). Query memakai `count` head, jadi tidak mengembalikan baris sensitif.

## Yang TIDAK dilakukan
- Tidak menambah trigger DB baru — sinyal sudah cukup dari `postgres_changes`.
- Tidak mengubah `AppVersionManager`, Maintenance, Release Notes, Cache, dll.
- Tidak mengubah dashboard utama (`/dashboard`) — itu sudah punya KPI sendiri.
- Tidak menambah chart panjang — fokus angka ringkas supaya panel ringan.

## Hasil akhir
Saat owner buka `/dashboard/system-management`, tab pertama langsung menampilkan kondisi operasional real-time (booking, pembayaran, customer baru, tire order, sesi online) dan akan auto-update saat ada transaksi masuk — tanpa membebani Realtime karena event di-debounce + ada fallback polling.
