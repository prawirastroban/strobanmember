## Perubahan

Tambahkan auto-capture identitas mekanik saat SPK **pertama kali dibuka oleh akun mekanik**, sehingga `mechanic_name` sudah tersimpan sebelum SPK ditutup.

**File**: `src/pages/spk/SPKCanvas.tsx` (di dalam `SPKCanvasInner`).

Tambahkan `useEffect` yang jalan setelah `spkRow` termuat:

- Guard: hanya jalan bila `role === "mechanic"`, `spkId` valid (UUID), `spkRow` sudah loaded, dan `spkRow.data.mechanic_user_id` belum ada (belum pernah tercatat).
- Ambil nama tampilan mekanik dengan urutan prioritas:
  1. `profiles.full_name` (query `.from("profiles").select("full_name").eq("id", user.id).maybeSingle()`)
  2. `user.user_metadata.full_name` / `name`
  3. `user.email`
- Merge tulis ke `spk_orders.data`:
  ```
  {
    ...existing,
    mechanic_user_id: user.id,
    mechanic_name: <resolved>,
    mechanic_opened_at: <existing || nowIso>,
    time_start: existing.time_start ?? nowIso,
  }
  ```
  `time_start` di-seed di sini agar durasi kerja dihitung dari waktu mekanik pertama membuka canvas (bukan saat SPK dibuat admin).
- Setelah update sukses, `setSpkRow` sinkron lokal supaya autosave tidak menimpanya.
- Ref guard (`didCaptureRef`) supaya efek hanya berjalan sekali per mount, aman terhadap re-render / autosave echo.

**FinishActionBar** tidak diubah — logikanya sudah membaca `existing.mechanic_name` lebih dulu, jadi nama yang tercatat saat SPK dibuka akan otomatis dipakai. `time_start` yang sudah di-seed juga otomatis dipakai untuk menghitung durasi.

**Catatan penting**: Tidak menyentuh field lain, tidak menambah kolom DB baru (semuanya di `spk_orders.data` yang sudah JSONB), tidak mengganggu autosave (menulis dengan merge lalu update `spkRow` lokal).

## Hasil

- Begitu akun mekanik membuka `/spk/:id`, `spk_orders.data.mechanic_name` + `mechanic_user_id` + `mechanic_opened_at` langsung terisi.
- `time_start` = waktu mekanik pertama buka SPK; `time_duration` saat Selesaikan dihitung dari titik itu.
- Ringkasan Waktu Pengerjaan menampilkan mekanik yang benar-benar mengerjakan SPK, walaupun mekanik berbeda menutupnya.