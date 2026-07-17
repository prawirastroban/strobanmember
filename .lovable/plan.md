## Audit hasil vs. daftar wajib

Dibanding daftar yang kamu kirim, tab **General Check Up** di `MechanicTabs.tsx` sekarang meleset:

**Engine / Brake System / Fluid Check** (harus: Spark plug, Power Steering Fluid, Transmission Fluid, Differential Gear Oil, Brake Cylinder, Brake Calipers)
- Ada: Spark Plug, Power Steering, Transmission Fluid
- Hilang: **Differential Gear Oil, Brake Cylinder, Brake Calipers**
- Ekstra (tidak di daftar): Engine Oil, Coolant, Air Filter, Fuel Filter → dihapus dari General agar sama persis (Engine Oil & Coolant tetap ada di tab Safety, jadi tidak hilang total)

**Other Components Check** (harus: Alternator)
- Hilang total di tab General: **Alternator** perlu ditambahkan

**Air Conditioning System Checking** (harus 13 item + Other remarks)
- Ada: Compressor, Magnetic Clutch, Condensor, Pipe, Switch (5)
- Hilang: **Compressor Oil, Evaporator, Motor Fan, Blower, Automatic, Cabin Air Filter, High Pressure, Low Pressure**, dan field **Other remarks (Note)**

**Suspension System Check** (harus 4 item + Part Replacement note)
- Ada: Wheel Bearing, Control Arm, Ball Joint, Shock Absorber ✓
- Hilang: field **Part Replacement (Note)**
- Judul group saat ini "Suspension & Brake" → dinormalkan jadi "Suspension System Check"

## Rencana perubahan (aman, additive untuk data lama)

1. **`src/components/spk/canvas/v2/MechanicTabs.tsx` — `GeneralPanel`**
   - Ganti group "Engine/Brake/Fluid Check (Extended)" agar berisi tepat 6 baris: Spark Plug, Power Steering Fluid, Transmission Fluid, Differential Gear Oil, Brake Cylinder, Brake Calipers.
   - Tambah group **Other Components Check** dengan 1 baris Alternator.
   - Lengkapi group AC menjadi 13 baris sesuai urutan daftar, lalu tambahkan textarea **Other Remarks** (field `ac_other_remarks`) di bawahnya.
   - Ubah judul group Suspension jadi "Suspension System Check" dan tambahkan textarea **Part Replacement** (field `suspension_part_replacement`).

2. **Field key baru** (dipakai oleh `useBinding` — tidak menabrak data lama):
   - `chk_diff_gear_oil`, `chk_brake_cylinder`, `chk_brake_calipers`
   - `chk_alternator`
   - `chk_ac_compressor_oil`, `chk_ac_evaporator`, `chk_ac_motor_fan`, `chk_ac_blower`, `chk_ac_automatic`, `chk_ac_cabin_air_filter`, `chk_ac_high_pressure`, `chk_ac_low_pressure`
   - `ac_other_remarks`, `suspension_part_replacement`
   Semua otomatis ikut autosave via `FormRuntimeProvider` (tidak butuh migrasi DB — kolom `spk_orders.data` JSONB).

3. **Textarea note kecil (reusable)**
   - Tambahkan komponen kecil di `MechanicTabs.tsx` (atau file baru `NoteRow.tsx` di folder v2) memakai tema glass yang sama (`border-white/10 bg-background/40`) agar konsisten dengan `ConditionRow`.

4. **`src/lib/spk/spkDisplayMap.ts`** — sinkronkan PDF
   - Daftarkan 12 key AC/engine/other baru di helper `inspection()` supaya keluar di **General Check Up** pada `SPKPrint.tsx`.
   - Tambahkan section render untuk `ac_other_remarks` dan `suspension_part_replacement` (tampil jika terisi).

5. **`SPKCanvas.tsx` — progress tracker**
   - Update daftar field yang dihitung oleh `SECTIONS` metadata agar 12 field kondisi baru ikut menyumbang progress; note tidak wajib (tidak menurunkan 100% jika kosong).

6. **Verifikasi**
   - Buka canvas sebagai mekanik, isi beberapa toggle baru → refresh → pastikan nilai tetap (autosave + hydration).
   - Cetak PDF: pastikan 12 item AC + Alternator + Diff Gear Oil + Brake Cylinder/Calipers + note muncul.
   - Data SPK lama tetap valid: key yang dihapus dari General (`chk_engine_oil`, `chk_coolant`, `chk_air_filter`, `chk_fuel_filter`) masih tersimpan di JSON — di UI Safety, Engine Oil tetap ada; Coolant/Air Filter/Fuel Filter tidak ditampilkan lagi tapi tidak dihapus dari record (aman untuk SPK lama).

## Ringkasan (untuk kamu)

Tab **General Check Up** akan dirapikan agar isinya persis sama dengan daftar kamu: 6 item engine/brake/fluid, 1 item Alternator, 13 item AC + catatan, dan 4 item suspensi + catatan Part Replacement. Perubahan hanya di frontend (tanpa migrasi DB), data SPK lama tetap aman.