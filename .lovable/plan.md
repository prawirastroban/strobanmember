Section **Paket & Servis** belum ada di `/spk/new` — masih di Canvas (Section 4). Rencana ini memindahkannya ke halaman intake dan menyinkronkan hasilnya ke Canvas + kartu di **All SPK**.

## 1. `src/pages/spk/SPKNewForm.tsx` — tambah section "Paket & Servis"

Ditambahkan tepat sebelum section **Persetujuan & Tanda Tangan**, isi identik dengan `ServiceOrderCard.tsx`:

- Merk / Jenis Oli (default `Shell Helix HX7 10W-40`)
- Checklist Service Umum (Ganti Oli + qty L, Tune Up M/P/U, Kaki-kaki, Spooring, Balancing, Oil Filter, Cuci Darah, Service AC, Brake Service, Safety Check)
- Others (textarea)
- Service Packages — Petrol (Bronze / Silver / Gold / Diamond / Promo Khusus)
- Service Packages — Diesel (Endurance / Full Pow)
- AC Package (Polar / Orca / Small / Medium / Large)
- Bonus (input)

State lokal `serviceOrder` di komponen. Saat submit, field-nya digabung ke `initialData` yang dikirim ke `SPKService.create()` dengan key sama persis dengan yang dipakai `useBinding` di Canvas:

```
service_oil_brand, service_umum, service_oil_qty, service_tune_up,
service_others, service_pkg_petrol, service_pkg_diesel, service_pkg_ac,
service_bonus
```

Kalau sumber = Booking, `service_name` booking dipakai sebagai default `service_others` (tidak menimpa kalau user sudah isi).

## 2. Shared constants — `src/components/spk/canvas/servicePackages.ts` (baru)

Pindahkan konstanta `SERVICE_UMUM`, `PACKAGES_PETROL`, `PACKAGES_DIESEL`, `AC_PACKAGE`, dan komponen `PackageGroup` dari `ServiceOrderCard.tsx` ke file ini supaya intake & Canvas pakai sumber yang sama.

## 3. `src/components/spk/canvas/ServiceOrderCard.tsx`

Import konstanta & `PackageGroup` dari file baru. Perilaku tidak berubah — Canvas Section 4 akan otomatis menampilkan nilai yang sudah diisi di intake karena `useBinding` membaca dari `spk_orders.data` yang sama.

## 4. Sinkron ke kartu di `SPKAllList.tsx`

Tambah baris ringkasan servis di `SpkCardItem` (baris keempat, muncul hanya jika ada isi):

```
Paket: Silver · +Ganti Oli, Tune Up (M) · Bonus: Cuci Gratis
```

Helper baru `buildServiceSummary(data)` di `src/lib/spk/spkDisplayMap.ts` menyusun string dari `service_pkg_petrol|diesel|ac`, `service_umum` yang bernilai true, `service_tune_up`, `service_others`, dan `service_bonus`. Realtime `spk_orders` yang sudah aktif akan memicu kartu untuk re-render setelah `SPKService.create()`.

## 5. Validasi

Semua field paket **opsional** (walk-in mungkin belum tahu). Submit tetap jalan kalau kosong, dan Section 4 di Canvas tetap bisa diisi mekanik seperti sebelumnya.

## File yang berubah

- `src/pages/spk/SPKNewForm.tsx` — section UI baru + payload
- `src/components/spk/canvas/servicePackages.ts` — **baru**, konstanta + `PackageGroup` shared
- `src/components/spk/canvas/ServiceOrderCard.tsx` — pakai import dari file baru
- `src/lib/spk/spkDisplayMap.ts` — tambah `buildServiceSummary`
- `src/pages/spk/admin/SPKAllList.tsx` — render ringkasan paket di kartu

Tidak ada perubahan DB — semua tersimpan di `spk_orders.data` (jsonb) dan konsumen lama (Canvas / PDF) langsung ikut membaca.