## Tujuan
Tampilkan nama mekanik yang mengerjakan SPK pada kartu di halaman `/dashboard/spk/all` (Semua SPK).

## Sumber Data
Nama mekanik sudah otomatis tercatat saat akun mekanik pertama kali membuka Canvas SPK (lihat `SPKCanvas.tsx` — menulis `mechanic_name`, `mechanic_user_id`, `time_start` ke `spk_orders.data`). Jadi tidak perlu perubahan skema atau backend — cukup baca `data.mechanic_name` yang sudah ada.

## Perubahan
**File: `src/pages/spk/admin/SPKAllList.tsx`**

1. Pada tipe `SpkCard`, tambah field `mechanic_name?: string`.
2. Di dalam `mapped` (loop `list.map`), ambil `textValue(snap.mechanic_name)` dari snapshot `data`.
3. Di komponen `SpkCardItem`, tampilkan baris kecil "Mekanik: <nama>" di bawah baris cabang/tanggal. Jika belum ada mekanik yang membuka (SPK masih draft / belum dipegang), tampilkan "Mekanik: Belum ditugaskan" dengan warna muted.
4. Tetap pakai style teks `text-[11px] text-muted-foreground` agar konsisten dengan baris info lain; gunakan ikon `Wrench` (lucide) di depan supaya cepat dikenali.

## Tidak Diubah
- Skema DB, RLS, migrasi — tidak ada.
- Logika Canvas SPK, autosave, workflow — tidak ada.
- Halaman lain (Canvas, Print PDF sudah menampilkan mekanik).

## Verifikasi
- Buka `/dashboard/spk/all`: kartu SPK yang sudah dibuka mekanik menampilkan nama mekaniknya; SPK draft yang belum dipegang menampilkan "Belum ditugaskan".
