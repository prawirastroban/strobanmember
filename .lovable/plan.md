
## Rencana: Reminder Service Page + Update Card Header

### 1. Ubah Card Header pada Dashboard
**File:** `src/components/UpcomingBookings.tsx`
- Ganti judul `"Jadwal Mendatang"` → `"Reminder Service"`
- Ganti subtitle → `"Servis terjadwal & pengingat berkala Anda"`
- Ganti icon `Calendar` → `Bell` agar lebih sesuai konteks reminder
- Tombol `"Pesan Baru"` di header diganti menjadi `"Lihat Semua"` yang navigasi ke halaman baru `/reminder-service`
- Batasi tampilan dashboard menjadi maksimal 2 booking (lebih ringkas), sisanya bisa dilihat di page baru

### 2. Buat Page Baru: Reminder Service
**File baru:** `src/pages/ReminderService.tsx`
- Halaman lengkap berisi:
  - **Header**: Navbar + judul "Reminder Service" dengan tombol kembali
  - **Section 1 — Jadwal Mendatang**: Daftar lengkap booking aktif (pending, confirmed, in-progress) dengan kemampuan cancel & lihat detail
  - **Section 2 — Pengingat Servis Berkala**: Berdasarkan `vehicles.last_service_date` + rekomendasi interval dari `src/lib/serviceRecommendation.ts` (sudah ada). Menampilkan kendaraan user dengan estimasi tanggal servis berikutnya & tombol "Pesan Sekarang"
  - **Section 3 — Riwayat Dibatalkan**: Booking yang baru dibatalkan + tombol reschedule
- Style: konsisten dengan liquid glass design (Apple-style, neon merah accents) sesuai brand

### 3. Routing
**File:** `src/App.tsx`
- Tambah route baru `/reminder-service` dibungkus `ProtectedRoute` (perlu login)

### 4. Integrasi ke Bottom Navigation
**File:** `src/components/BottomNav.tsx`
- Tab **"Pesanan"** (icon ClipboardList) saat ini mengarah ke `/profile/history-perawatan`
- **Pendekatan**: ubah tab "Pesanan" agar mengarah ke `/reminder-service` (lebih relevan karena fokus ke jadwal aktif & reminder, bukan riwayat lama)
- Aktif state: cocokkan path `/reminder-service`, `/my-booking`, `/booking/status`, `/profile/history*`
- Halaman `/reminder-service` akan menyediakan link ke halaman riwayat lengkap (`/profile/history-perawatan`) untuk pengguna yang ingin melihat servis lama

### 5. i18n
**Files:** `src/i18n/id.ts`, `src/i18n/en.ts`
- Tambah key baru di `t.reminderService`: `title`, `subtitle`, `upcomingSection`, `recurringSection`, `cancelledSection`, `viewHistory`, `bookNow`, `noReminders`

### Diagram Alur Navigasi
```text
[Bottom Nav: Pesanan] ──► /reminder-service ──┬──► detail booking (/my-booking/:id)
                                              ├──► booking baru (/booking)
                                              └──► riwayat lengkap (/profile/history-perawatan)

[Dashboard Card: Reminder Service] ──► (preview 2 item) ──► [Lihat Semua] ──► /reminder-service
```

### Catatan Teknis
- Reminder berkala dihitung di client menggunakan helper yang sudah ada (`recommendNextService`)
- Realtime subscription Supabase tetap dipakai untuk auto-refresh saat status booking berubah
- Tidak ada perubahan database/RLS — hanya pakai tabel `bookings` & `vehicles` yang sudah accessible
