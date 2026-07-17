## Diagnosis

Screenshot + code review menunjukkan 4 masalah nyata di `/spk/:id`:

1. **Progress bar tidak pernah 100%.** `SECTIONS.requires` di `src/pages/spk/SPKCanvas.tsx` masih memakai key legacy (`insp_suspension_part_replacement`, `tyre_fl_status`, `ac_remarks`, `engine_service_lainnya`, …) padahal Canvas v2 (`MechanicTabs`) menulis key baru (`chk_engine_oil_cond`, `chk_brake_fluid_cond`, `tyre_fl_cond`, `lamps_cond`, `estimasi_items`, …). Selain itu `sec-time` punya `requires: []` → statusnya selamanya `waiting` sehingga ikut mengunci progress di bawah 100%.

2. **BottomNav global (Beranda / Promo / Katalog / Cabang / Akun) menutupi `FinishActionBar`.** `src/components/BottomNav.tsx` menyembunyikan diri untuk `/dashboard/*`, `/booking/*`, `/auth`, tapi tidak untuk `/spk/*`. Di layar mekanik, bar putih di bawah menutupi tombol **Selesaikan SPK**, membuat user berpikir "tombol tidak ada".

3. **Finalisasi pengerjaan tanpa TTD mekanik.** `FinalizationCard.tsx` saat ini hanya menampilkan catatan + ringkasan waktu; blok signature mekanik pernah dihapus. Mekanik minta UI tanda tangan sebelum menutup SPK.

4. **Ringkasan waktu pengerjaan kosong.** Field `time_start`, `time_end`, `time_duration`, `mechanic_name` tidak pernah diisi. `FinishActionBar.handleFinish` hanya menulis `closed_at`. `TimeBlock` di `FinalizationCard` menampilkan "—" karena data tidak diisi saat finish.

## Perubahan

**A. `src/components/BottomNav.tsx`** — tambahkan `/spk` ke daftar route yang menyembunyikan BottomNav (tanpa mengganggu `/dashboard/spk/*` yang sudah tersembunyi). Aturannya: `location.pathname === "/spk" || location.pathname.startsWith("/spk/")` → `return null`.

**B. `src/pages/spk/SPKCanvas.tsx` — SECTIONS diselaraskan dengan Canvas v2**

```text
sec-customer      requires customer_name, customer_phone
sec-vehicle       requires vehicle_merk, vehicle_tipe, vehicle_plate, vehicle_mileage_now
sec-complaint     requires complaint_note
sec-service-order requires service_oil_brand, service_oil_qty
sec-safety        requires chk_engine_oil_cond, chk_brake_fluid_cond,
                           chk_brake_pad_front_cond, chk_brake_pad_rear_cond,
                           tyre_fl_cond, tyre_fr_cond, tyre_rl_cond, tyre_rr_cond
sec-general       requires chk_spark_plug_cond, chk_coolant_cond,
                           chk_air_filter_cond, chk_ac_compressor_cond
sec-estimasi      requires estimasi_items      (array length > 0)
sec-finalization  requires mechanic_note, signature_mekanik
```

`sec-time` dihapus dari daftar (bukan section user-facing; waktu diisi otomatis saat Selesai). Ini menyelaraskan `ux.completedCount / ux.totalCount` dengan section yang benar-benar tampil di canvas, sehingga progress bisa mencapai 100%.

**C. `src/components/spk/canvas/FinalizationCard.tsx`** — tambahkan kembali blok tanda tangan mekanik memakai `SignaturePadBound` yang sudah ada:

```tsx
<BlockHeading icon={<PenLine …/>} title="Tanda Tangan Mekanik" />
<SignaturePadBound code="signature_mekanik" label="Mekanik — Final Check" />
```

Ditempatkan setelah Notes, sebelum Time Summary. Tanpa checklist approval (sudah diambil di /spk/new). Nilai `signature_mekanik` dipersist otomatis ke `spk_orders.data` oleh komponen itu — kompatibel dengan PDF (`spkDisplayMap` sudah membaca key ini).

**D. `src/pages/spk/SPKCanvas.tsx › FinishActionBar.handleFinish`** — saat menutup SPK, isi ringkasan waktu:

```ts
const nowIso = new Date().toISOString();
const existing = spkRow?.data ?? {};
const startIso =
  (existing.time_start as string) ||
  (spkRow?.in_progress_at as string) ||
  (spkRow?.opened_at as string) ||
  (spkRow?.created_at as string) ||
  nowIso;
const durationMin = Math.max(
  0,
  Math.round((new Date(nowIso).getTime() - new Date(startIso).getTime()) / 60000),
);
const durationText = `${Math.floor(durationMin / 60)}j ${durationMin % 60}m`;

update spk_orders.data = {
  ...existing,
  time_start: startIso,
  time_end: nowIso,
  time_duration: durationText,
  date_in: existing.date_in ?? (spkRow?.opened_at ?? spkRow?.created_at ?? nowIso),
  date_out: nowIso,
  time_in: existing.time_in ?? new Date(spkRow?.opened_at ?? spkRow?.created_at ?? nowIso)
             .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  time_out: new Date(nowIso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  mechanic_name: existing.mechanic_name ?? (profile?.full_name ?? profile?.email ?? role),
  closed_at: nowIso,
  closed_by_role: role,
}
```

Nama mekanik diambil dari `profiles` (via `useAuth().user.id` + query kecil, atau langsung dari `user.user_metadata.full_name`) sehingga `TimeBlock` menampilkan mekanik yang menyelesaikan.

**E. Validasi Selesaikan** — tetap panggil `runtime.validateAll()` (sudah ada). Karena `signature_mekanik` sekarang jadi requirement `sec-finalization`, tombol Selesaikan otomatis menolak jika mekanik belum tanda tangan dan auto-scroll ke pad TTD.

## Hasil yang diharapkan

- Progress bar mencapai 100% ketika semua tab (Safety, General, Estimasi) + TTD mekanik + catatan terisi.
- BottomNav umum tidak lagi muncul di `/spk/:id`; tombol **Selesaikan SPK** terlihat di semua device.
- Card **Finalisasi Pengerjaan** menampilkan Catatan Mekanik → Tanda Tangan Mekanik → Ringkasan Waktu.
- Setelah klik Selesaikan, `time_start / time_end / time_duration / mechanic_name / date_out` tersimpan ke `spk_orders.data` dan tampil di canvas maupun PDF.

Scope tetap di frontend Canvas + BottomNav; tidak ada perubahan skema DB atau workflow engine.