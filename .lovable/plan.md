## Masalah

Setelah SPK baru dibuat, sebagian data (nama customer, plat, keluhan, service order, dsb.) bisa kosong saat dibuka kembali oleh mekanik atau admin. Root cause bukan di simpan-nya SPKNewForm — payload sudah lengkap disimpan oleh `SPKService.create()`. Masalah muncul saat Canvas dibuka kembali: **autosave menimpa `spk_orders.data` dengan nilai default kosong sebelum hidrasi runtime selesai**.

Alur bug:

```text
t=0    Canvas mount, spkRow=null → runtime.values = {}, autosave firstRun baseline=""
t=1    useBinding di setiap komponen mem-"seed" default kosong (customer_name="", vehicle_plate="", chk_*=false, service_umum={})
       → runtime.values berisi banyak string kosong / false
t=~50  Autosave debounce (500 ms) berjalan; jika hidrasi DB belum selesai → merge = {...db, ...emptySeeds}
       → field DB yang sebelumnya terisi (customer_name, plat, dst.) OVERWRITTEN oleh string kosong
t=~200 spkRow akhirnya masuk, tapi DB sudah tertimpa
```

Perbaikan intinya: **jangan pernah menulis ke DB sebelum runtime selesai hidrasi dari baris SPK yang di-load**, dan **jangan izinkan default seed dari `useBinding` menimpa key yang sudah ada di DB**.

## Rencana

### 1. Tambah flag `hydrated` di FormRuntimeProvider (`src/hooks/spk/FormRuntimeProvider.tsx`)

- Ubah `hydratedRef` menjadi state `hydrated` (atau ekspos boolean via context) yang berubah `true` hanya setelah first-hydration DB berhasil dijalankan (yaitu setelah `initialValuesReady=true` dan `initialValues` di-merge).
- Ekspor `hydrated` di `FormRuntimeContextValue`.
- Cegah `useBinding` melakukan `setValue(code, initial)` seeding sebelum `hydrated=true`. Selama belum hidrasi, `useBinding` cukup mengembalikan `initial` secara lokal tanpa menyentuh `rt.values`. Ini menghilangkan sumber utama "empty seed → overwrite DB".

### 2. Gate autosave sampai hidrasi selesai (`src/hooks/spk/useSPKAutosave.ts` + `src/pages/spk/SPKCanvas.tsx`)

- Tambah parameter `enabled: boolean` pada `useSPKAutosave`. Di Canvas, teruskan `enabled = runtime.hydrated`.
- Selama `enabled=false`: jangan set baseline, jangan schedule flush, dan jangan flush pada `pagehide`/`visibilitychange`.
- Reset `firstRunRef` supaya setelah `enabled` menjadi `true`, snapshot pertama diambil dari values yang **sudah dihidrasi DB** — bukan dari empty seeds.

### 3. Autosave "non-destructive" (`src/hooks/spk/useSPKAutosave.ts`)

Sebagai safety-net kedua walaupun hidrasi sudah rapi:

- Sebelum merge, buang key yang bernilai "empty default" (`""`, `null`, `undefined`, `{}`, `[]`, `false`) **jika key yang sama sudah ada dengan nilai non-empty di `current.data`**. Jadi autosave tidak pernah menimpa data yang tersimpan dengan default kosong; hanya user edit eksplisit yang bisa mengosongkan sebuah field (dan itu tidak terjadi di skenario reopen).
- Ini melindungi kasus edge: tab kedua, race saat flush `pagehide`, atau komponen yang mounting belakangan.

### 4. Verifikasi payload intake tetap lengkap (`src/pages/spk/SPKNewForm.tsx`)

Payload sekarang sudah menyimpan: customer/vehicle/complaint/service_* + signatures. Yang perlu ditambahkan supaya benar-benar sinkron dengan pembacaan Canvas:

- `service_pkg_petrol_note`, `service_pkg_diesel_note`, `service_pkg_ac_note` (jika field note dipakai di Canvas — cek key di `ServiceOrderCard` dan tambahkan hanya key yang benar-benar ada).
- Simpan juga `booking_id`, `customer_id`, `vehicle_id` yang sudah di argumen `SPKService.create` — sudah OK.
- Pastikan `service_umum` disimpan sebagai object apa adanya (sudah OK) dan `svcOilQty` sebagai string (biarkan seperti sekarang).

Tidak menambah kolom baru — hanya memastikan tidak ada field intake yang jatuh ke default kosong di runtime.

### 5. Uji cepat

- Buat SPK baru, arahkan ke `/spk/all`, buka SPK sebagai admin → semua field terlihat.
- Buka SPK yang sama sebagai mekanik → semua field intake tetap terisi; setelah checklist diisi lalu keluar-masuk, checklist tetap ada.
- Reload halaman Canvas beberapa kali cepat (untuk memicu race hidrasi/autosave lama) → data tetap utuh.

## Sentuhan file

- `src/hooks/spk/FormRuntimeProvider.tsx` — expose `hydrated`, gate `useBinding` seeding.
- `src/hooks/spk/useSPKAutosave.ts` — terima `enabled`, tambahkan filter non-destructive.
- `src/pages/spk/SPKCanvas.tsx` — teruskan `runtime.hydrated` ke `useSPKAutosave`.
- `src/pages/spk/SPKNewForm.tsx` — hanya jika audit menemukan key intake yang belum di-serialize; kalau semua sudah ada, tidak diubah.

Tidak ada perubahan DB / migrasi.
