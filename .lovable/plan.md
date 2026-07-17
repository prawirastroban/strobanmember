## Hasil Audit — Form `/spk/new` vs Canvas SPK

Membandingkan field yang direkam di Canvas (`CustomerCard`, `VehicleCard`, `ComplaintCard`, `ServiceOrderCard`) dengan `SPKNewForm.tsx`. Semua key harus sama supaya Canvas tinggal membaca ulang lewat `useBinding` tanpa data kosong.

| Canvas key | Ada di intake? | Catatan |
|---|---|---|
| customer_name, customer_phone, customer_platform | ✅ | Intake mendukung 5 nilai platform, Canvas hanya menampilkan `iklan`/`organik` — nilai lain tetap tersimpan, hanya tidak highlight di Canvas. Tidak perlu diubah sekarang. |
| vehicle_merk, vehicle_tipe, vehicle_tahun, vehicle_plate, vehicle_mileage_now | ✅ | |
| **vehicle_mileage_next** | ❌ **HILANG** | Canvas menampilkan field ini di Section 2 tapi intake tidak menulis apapun → selalu kosong saat SPK dibuka. |
| complaint_note, complaint_estimasi | ✅ | |
| **complaint_konfirmasi** | ❌ **HILANG** | "Waktu Konfirmasi" di Section 3 tidak pernah terisi dari intake. |
| complaint_photos (Foto Bukti Keluhan) | ⚠️ optional | Tetap dikerjakan mekanik/admin di Canvas — tidak perlu di intake. |
| service_oil_brand … service_bonus | ✅ | |
| signature_admin, signature_customer, customer_approved_at | ✅ | |

## Rencana Perbaikan (`src/pages/spk/SPKNewForm.tsx` — file tunggal)

1. **Zod schema** — tambah:
   - `vehicle_mileage_next: z.string().trim().regex(/^[\d.,]*$/, "Hanya angka").max(12).optional().or(z.literal(""))`
   - `complaint_konfirmasi: z.string().trim().max(60).optional().or(z.literal(""))`
2. **State `EMPTY`** — tambah dua key baru dengan nilai `""`.
3. **Prefill dari booking / vehicle** — di `applyBookingToForm` dan `applyVehicleToForm` set `vehicle_mileage_next` = "" (fallback), agar reset ulang bersih saat pindah sumber.
4. **UI**:
   - Di kartu **Data Kendaraan**, tambahkan grid kolom untuk `vehicle_mileage_next` bersebelahan dengan `vehicle_mileage_now`. Label: "Kilometer Servis Berikutnya", hint "Opsional. Angka odometer target servis berikutnya.", `inputMode="numeric"`, sama sanitizer regex-nya seperti `vehicle_mileage_now`.
   - Di kartu **Keluhan Pelanggan**, tambahkan field `complaint_konfirmasi` di bawah "Estimasi Waktu" (grid 2 kolom di ≥sm). Label: "Waktu Konfirmasi", hint: "Opsional. mis. '14:30' atau 'setelah cek awal'.", `maxLength=60`.
5. **Payload `initialData` (handleSubmit)** — sisipkan dua key baru:
   ```ts
   vehicle_mileage_next: v.vehicle_mileage_next ?? "",
   complaint_konfirmasi: v.complaint_konfirmasi ?? "",
   ```
   Nama key persis mengikuti `useBinding` di Canvas supaya hidrasi otoritatif (fix sebelumnya) menaruhnya di posisi yang tepat.
6. **Validasi ulang** — jalankan form, buat SPK baru, buka di Canvas, verifikasi kedua field terisi otomatis dan tidak kosong.

Tidak menyentuh Canvas, Runtime, atau service layer — semua kunci sudah dikenal Canvas; hanya intake yang perlu melengkapi payload.

## File Terdampak
- `src/pages/spk/SPKNewForm.tsx` — satu-satunya file yang berubah (schema, EMPTY, UI, initialData).
