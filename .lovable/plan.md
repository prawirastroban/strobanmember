
# Audit: Quick Booking Flow (Admin → Customer Baru → Booking)

Audit ini **hanya laporan**, tidak ada perubahan kode/DB/endpoint sesuai instruksi.

---

## 1. Flow Saat Ini (Yang Benar-benar Terjadi)

```text
Staff/Admin klik "Pesan Servis"
   └─> StaffQuickBookingDialog
        ├─ Step 1: pilih / buat Customer (InlineAddCustomer)
        │     └─ panggil edge fn `admin-user-ops` action=create_customer
        │         ├─ auth.admin.createUser({ email, password=random UUID+"Aa1!", email_confirm:true })
        │         ├─ user_metadata.created_by_staff = true
        │         ├─ upsert profiles (is_verified = true)
        │         └─ upsert user_roles (role = 'customer')
        ├─ Step 2: pilih / buat Vehicle (insert ke vehicles dgn user_id = customerId)
        ├─ Step 3: pilih service / branch / date / time / promo
        └─ Step 4: insert ke bookings (user_id = customerId, created_by = staff)
```

Setelah booking dibuat:
- Customer **punya akun auth** (auto-confirmed, role `customer`, `is_verified=true`).
- Tidak ada email/WA yang dikirim ke customer.
- Password = UUID acak — **tidak pernah ditampilkan ke staff maupun customer**.
- Tidak ada redirect, magic-link, atau onboarding link untuk customer.

---

## 2. Hubungan Data (Sudah Benar)

| Relasi | Status |
|---|---|
| auth.users ↔ profiles (id 1:1) | OK — upsert by id |
| profiles ↔ user_roles | OK — role `customer` di-upsert |
| vehicles.user_id → customerId | OK |
| bookings.user_id → customerId, bookings.created_by → staffId | OK |

→ **Tidak ada customer/vehicle/booking yatim**. Data CRM solid.

---

## 3. Gap Yang Ditemukan (Customer Experience)

| # | Gap | Detail | Severity |
|---|---|---|---|
| G1 | **Customer tidak tahu akunnya ada** | Tidak ada email/WA welcome, tidak ada notifikasi "akun dibuatkan oleh Stroban". | 🔴 Tinggi |
| G2 | **Customer tidak bisa login pertama kali** | Password = UUID acak yang dibuang. Tidak ada magic link, tidak ada "set password" link, tidak ada OTP WA otomatis. | 🔴 Tinggi |
| G3 | **Tidak ada notifikasi booking ke customer** | Booking dibuat staff, tapi tidak ada WA/email konfirmasi ke nomor customer. | 🔴 Tinggi |
| G4 | **Tidak ada self-service tracking link** | Customer hanya dapat lihat status/histori/invoice/loyalty/reward jika berhasil login — yang mana mereka tidak bisa (G2). | 🟠 Sedang |
| G5 | **Login via WhatsApp tidak otomatis** | `ResetPasswordWA` ada, tapi customer harus tahu sendiri untuk membuka /auth → "lupa password" → input nomor. Tidak ada CTA/link langsung. | 🟠 Sedang |
| G6 | **Email synthetic tidak ditangani** | Jika staff isi email kosong, edge fn menolak. Tidak ada fallback "buat akun dgn nomor HP saja" (padahal `phoneToEmail` sudah ada di lib). Customer tanpa email = tidak bisa dibuatkan akun via Quick Booking. | 🟠 Sedang |
| G7 | **Tidak ada `acquisition_source = 'staff_created'`** | Profile dibuat tanpa source → CRM tidak bisa pisahkan "customer hasil quick booking" vs organik. | 🟡 Rendah |
| G8 | **Loyalty/Reward tidak ter-trigger** | Booking pertama via quick booking → customer tidak tahu sudah dapat poin, karena tidak ada notifikasi. | 🟡 Rendah |
| G9 | **Tidak ada anti-duplicate berdasarkan nomor HP** | Dedup hanya by email. Customer dgn nomor sama tapi email beda → akun ganda. | 🟡 Rendah |

---

## 4. Risiko

**Bisnis**
- Conversion rendah: customer tidak pernah jadi user aktif → tidak rebook, tidak install app, tidak claim loyalty.
- Data WA terkumpul tapi **tidak monetizable** (tidak ada follow-up otomatis).
- Reputasi: customer merasa "dibuatkan akun tanpa pemberitahuan" → keluhan privacy.

**Customer Experience**
- Customer datang ke bengkel, di-quick-book, lalu **menghilang dari ekosistem digital**.
- Untuk lihat status servis harus telepon/WA manual ke bengkel.
- Saat coba login sendiri → password unknown → ke "lupa password" → email synthetic tidak menerima email → **dead end**.

---

## 5. Rekomendasi Perbaikan (Belum Diimplementasi)

**P0 — Wajib (akses akun)**
1. Setelah `create_customer` sukses, kirim WhatsApp otomatis berisi:
   - Konfirmasi akun dibuat
   - Link 1-tap login (magic link / token sekali pakai berlaku 7 hari)
   - Atau: link `wa-password-reset` yang sudah ada, di-prefill nomor
2. Tambah `acquisition_source = 'staff_created'` saat upsert profile.
3. Setelah `bookings.insert` sukses di Quick Booking, panggil `notify-booking-status` (atau equivalent) ke nomor customer berisi: detail booking + link tracking publik.

**P1 — Pengalaman**
4. Tambahkan halaman tracking publik berbasis token (mis. `/track/<booking_id>?t=<hash>`) yang tampilkan: status, ETA, invoice, tanpa login. Login = upgrade ke full dashboard.
5. Mode "tanpa email" di `create_customer`: pakai `phoneToEmail()` bila email kosong (skema sudah ada di `src/lib/phoneEmail.ts`).
6. Dedup berdasarkan nomor HP (normalisasi E.164) di samping email.

**P2 — CRM & Loyalty**
7. Trigger welcome WA berisi info loyalty (Member ID, poin awal).
8. Marketing tag: pisahkan funnel staff-created vs self-signup di Reports Hub.

---

## 6. Prioritas Eksekusi

| Prioritas | Item | Effort | Impact |
|---|---|---|---|
| 1 | WA welcome + magic-link login (G1, G2) | Sedang | 🔴 Sangat Tinggi |
| 2 | WA konfirmasi booking ke customer (G3) | Kecil | 🔴 Tinggi |
| 3 | Public booking tracking link (G4) | Sedang | 🟠 Sedang |
| 4 | Akun via nomor HP (G6) + dedup phone (G9) | Kecil | 🟠 Sedang |
| 5 | `acquisition_source='staff_created'` (G7) | Kecil | 🟡 CRM |
| 6 | Loyalty welcome WA (G8) | Kecil | 🟡 Retensi |

---

## 7. Kesimpulan

Sisi **data integrity AMAN**: akun, profile, role, vehicle, dan booking sudah terhubung dengan benar; tidak ada record yatim.

Sisi **pengalaman customer BROKEN**: customer hasil Quick Booking secara teknis **memiliki akun** tapi **tidak memiliki cara untuk mengakses akun tersebut**, dan **tidak diberitahu apapun**. Mereka jadi "ghost users" — ada di database, tidak ada di product.

Rekomendasi utama: implementasikan **WA-based onboarding otomatis** sebagai langkah P0 setelah audit ini disetujui. Tidak ada perubahan database struktural yang diperlukan untuk P0; cukup penambahan side-effect setelah `create_customer` dan `bookings.insert` di edge function/dialog.

Mohon konfirmasi untuk lanjut ke tahap implementasi (mulai dari prioritas mana).
