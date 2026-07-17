## Perubahan

### 1) Tambahkan grup "Suspension & Brake" pada Canvas SPK (tab General Check Up)

File: `src/components/spk/canvas/v2/MechanicTabs.tsx`

Tambahkan `ChecklistGroup` baru di tab **General Check Up** setelah "Air Conditioning System Checking":

```
Suspension & Brake
- Wheel Bearing   → chk_suspension_wheel_bearing
- Control Arm     → chk_suspension_control_arm
- Ball Joint      → chk_suspension_ball_joint
- Shock Absorber  → chk_suspension_shock_absorber
```

Rendered pakai `ConditionRow` (GOOD/OK/BAD) supaya seragam tema liquid glass dengan grup lain.

### 2) Sinkronkan ke hasil cetak PDF

File: `src/lib/spk/spkDisplayMap.ts`

Ubah pemetaan `suspension` agar membaca key v2 lebih dulu (fallback ke legacy):

```
inspection(d, ["chk_suspension_wheel_bearing_cond", "insp_suspension_wheel_bearing"], "Wheel Bearing")
inspection(d, ["chk_suspension_control_arm_cond", "insp_suspension_control_arm"], "Control Arm")
inspection(d, ["chk_suspension_ball_joint_cond", "insp_suspension_ball_joint"], "Ball Joint")
inspection(d, ["chk_suspension_shock_absorber_cond", "insp_suspension_shock_absorber"], "Shock Absorber")
```

Dengan begitu status yang diisi mekanik di canvas langsung muncul di `SPKPrint.tsx` (yang sudah render `display.suspension`) dan di `SPKCustomerApprove.tsx`.

### 3) Kosongkan default Service Order pada `/spk/new`

File: `src/components/spk/canvas/ServiceOrderCard.tsx`

Hapus semua nilai default yang mengisi form sebelum admin input:

- `service_oil_brand`: `"Shell Helix HX7 10W-40"` → `""`
- `service_umum`: `{ ganti_oli: true, oil_filter: true }` → `{}` (semua checkbox kosong)
- `service_oil_qty`: `"4"` → `""`
- `service_pkg_petrol`: `"Silver"` → `null` (tidak ada paket terpilih)

Tambahkan `placeholder` pada input Merk/Jenis Oli & Qty agar tetap informatif tanpa mengisi nilai.

### Catatan teknis

- Tidak ada perubahan database — key baru `chk_suspension_*_cond` otomatis tersimpan lewat `useBinding` seperti checklist v2 lain.
- SPK lama tetap tampil benar di PDF karena fallback ke key legacy `insp_suspension_*`.
- Tidak ada perubahan role/workflow.