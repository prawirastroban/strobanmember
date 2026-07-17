## Tujuan
Pada kartu SPK di `/dashboard/spk/all`, nama mekanik (baris dengan ikon 🔧) harus benar-benar diambil dari **akun mekanik pertama yang membuka canvas SPK**, bukan dari admin pembuat atau nilai sisa lainnya.

## Temuan Audit

1. **Sumber data kartu** (`SPKAllList.tsx` line 320) sudah benar — membaca `spk_orders.data.mechanic_name`.
2. **Auto-capture di canvas** (`SPKCanvas.tsx` line 244-297) sudah menulis `mechanic_user_id`, `mechanic_name`, `mechanic_opened_at`, dan `time_start` saat pertama kali dibuka — namun **hanya** ketika `role === "mechanic"`.
3. **Celah**: `useEffectiveSpkRole()` (line 200-213) melakukan short-circuit `isAdmin → "admin"`, `isAdminCabang → "admin_cabang"` **sebelum** `isMekanik`. Jika satu akun kebetulan punya role ganda (mis. `admin_cabang` + `mekanik`), effective role bukan `"mechanic"` dan auto-capture tidak jalan → kolom mekanik tetap kosong meskipun secara faktual mekanik-lah yang membuka SPK.
4. **Form pembuatan SPK** (`SPKNewForm.tsx`) tidak pernah menulis `mechanic_name` — jadi tidak ada risiko nama admin bocor sebagai mekanik. ✅

## Perbaikan (build mode)

**File:** `src/pages/spk/SPKCanvas.tsx`

- Tambahkan `isMekanik` (dari `useUserRole()`) ke prop `SPKCanvasInner`.
- Ubah kondisi auto-capture:
  - Dari: `if (role !== "mechanic") return;`
  - Menjadi: `if (!isMekanik) return;` — sehingga siapa pun yang memegang role DB `mekanik` akan tercatat saat pertama kali membuka SPK yang belum memiliki `mechanic_user_id`, tanpa terpengaruh oleh urutan resolusi `useEffectiveSpkRole`.
- Guard tambahan tetap dipertahankan: `if (existing.mechanic_user_id) return;` — sekali tercatat, tidak akan tertimpa oleh pembuka berikutnya.
- Tidak menulis apa pun untuk role selain mekanik (admin/staff yang sekadar melihat tetap tidak akan tercatat).

## Verifikasi

- Buka SPK baru dengan akun mekanik → cek `spk_orders.data.mechanic_name` = nama akun tersebut, dan kartu di `/dashboard/spk/all` menampilkan nama itu.
- Buka SPK yang sama dengan akun mekanik lain → nama pertama tetap dipertahankan (tidak tertimpa).
- Admin/staff yang membuka SPK yang belum pernah dibuka mekanik → kolom tetap "Belum ditugaskan".
