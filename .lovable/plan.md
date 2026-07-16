## Masalah

Setelah admin submit intake SPK di `/spk/new`, saat akun mekanik membuka SPK-nya, semua field (Merk, Tipe, No. Polisi, Mileage, Catatan Customer, dll) tampil kosong — padahal data sudah tersimpan di `spk_orders.data`.

## Akar Bug

Ada regresi pada hydration logic di `FormRuntimeProvider.tsx` yang dipasang sebelumnya (untuk memperbaiki race condition GOOD/OK/BAD).

Alur yang salah saat ini:

1. `SPKCanvas` mount → `spkRow` masih `null` → `initialValues = {}`.
2. Provider mount, effect hydration jalan pertama kali dengan `initialValues={}`. Karena `hydratedRef.current` masih `false`, blok "first hydration" jalan → `hydratedRef.current = true`, `values` tetap kosong.
3. Setiap `useBinding("customer_name", "")` men-seed key ke store dengan string kosong. Jadi sekarang `values` = `{ customer_name: "", vehicle_merk: "", ... }`.
4. `useSPKRow` selesai fetch → `spkRow.data` berisi data intake → `initialValues` berubah → effect jalan lagi.
5. Karena `hydratedRef.current = true`, jalur "echo autosave" yang aktif: `if (!(k in prev))` — tapi semua key sudah ada (seeded string kosong), jadi **tidak ada** yang di-merge. Data DB dibuang.

Akibat: mekanik lihat form kosong.

## Perbaikan

Buat "first hydration" hanya terhitung setelah DB benar-benar loaded (`initialValues` non-empty untuk SPK real).

Ubah `src/hooks/spk/FormRuntimeProvider.tsx`:

- Tambahkan prop opsional `initialValuesReady?: boolean` (default `true` untuk backward compat).
- Hydration `useEffect` skip selama `initialValuesReady === false`.
- Saat pertama kali `initialValuesReady === true` DAN belum ter-hydrate: overwrite key di `prev` yang bernilai `""`, `null`, atau `undefined` dengan nilai dari `initialValues` (biar seed default dari `useBinding` tidak menang atas data DB). Setelah itu tandai `hydratedRef.current = true`.
- Setelah hydrated: perilaku echo tetap seperti sekarang (jangan overwrite runtime state agar bug klik GOOD/OK/BAD tidak balik).

Ubah `src/pages/spk/SPKCanvas.tsx`:

- Kirim `initialValuesReady={!id || !!spkRow}` ke `FormRuntimeProvider`. Untuk mode design-preview (`!id`) langsung `true`; untuk SPK real, `true` hanya setelah `spkRow` loaded.

## Verifikasi

1. Login sebagai admin → `/spk/new` → isi data lengkap + tanda tangan → submit.
2. Logout, login sebagai mekanik → buka SPK yang barusan dibuat.
3. Pastikan Vehicle Information (Merk, Tipe, Tahun, No. Polisi, Mileage), Customer Complaint (Catatan Customer), dan Service Order (paket + brand oli) sudah terisi persis seperti input admin.
4. Klik GOOD/OK/BAD berturut-turut di Safety Check — pastikan status stabil, tidak balik ke kosong (regresi lama tidak muncul lagi).
