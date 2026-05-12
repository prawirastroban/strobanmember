## Masalah

Di mobile (`/dashboard/keuangan/referral` tab Pencairan), kolom tabel **Bank/Rekening** dan **Jumlah** terlalu lebar isinya, tapi header `<th>` mengikuti lebar konten kecil sehingga teks header tertumpuk vertikal huruf-per-huruf (B-a-n-k, U-s-e-r, J-u-m-l-a-h). Tabel pakai `overflow-x-auto` jadi konten kanan (Status, Riwayat, Aksi) ikut terpotong dan harus discroll.

## Solusi

Ganti pendekatan: pada layar `<sm` (mobile) sembunyikan tabel & render **daftar kartu** per pencairan; pada `≥sm` tetap pakai tabel seperti sekarang. Pendekatan kartu memberi:
- Semua info (user, bank, rek, jumlah, status, riwayat) terbaca tanpa scroll horizontal.
- Tombol aksi (Setujui / Tolak / Tandai Sudah Ditransfer / Detail) full-width dan selalu terlihat.
- Pola sama yang sudah dipakai di komponen admin lain untuk konsistensi.

### Perubahan di `src/components/admin/keuangan/ReferralManager.tsx` (tab Pencairan saja)

1. **Tabel desktop**: bungkus blok `<Table>` (saat ini di `overflow-x-auto`) jadi `<div className="hidden sm:block overflow-x-auto">`. Tidak ada perubahan struktur tabel.

2. **Daftar kartu mobile**: tambahkan `<div className="sm:hidden divide-y">` di atasnya, render `filteredW.map((w) => ...)` dengan kartu:
   - Baris atas: nama user (bold) + `statusBadge(w.status)` di kanan.
   - Baris kecil muted: phone user, tanggal pengajuan.
   - Blok rekening: Bank • No rek • Atas nama (1 baris truncate) + nominal besar di kanan.
   - Jika sudah `processed_at`: baris kecil ikon + waktu proses.
   - Tombol aksi sesuai status, **tetap pakai handler yang sama** (`setApproveOpen`, `setRejectOpen`, `setPayOpen`, `setDetailOpen`):
     - `pending` → tombol **Setujui** (full-width primary outline) + **Tolak** (full-width destructive).
     - `approved` → **Tandai Sudah Ditransfer** (full-width primary) + **Tolak** (outline destructive).
     - `paid` / `rejected` → **Detail** (full-width outline).
   - Kondisi kosong: pesan "Belum ada permintaan".

3. **Filter chip bar** (Semua / Menunggu / Siap Transfer / Selesai / Ditolak): tetap, tapi pastikan `flex-wrap` sudah cukup; tidak diubah.

4. **Helper alur status** kecil di header tab tetap dipertahankan; hanya pastikan tetap rapi di mobile (sudah `text-[11px] leading-relaxed`, oke).

5. **Tab lain (Komisi, Voucher, Top Referrer)** juga punya tabel di `overflow-x-auto`. Untuk konsistensi mobile, terapkan pola yang sama:
   - **Komisi**: kartu dengan nama referrer, badge tipe, nominal, status.
   - **Voucher**: kartu dengan kode (mono), nilai, status, expiry.
   - **Top Referrer**: kartu dengan nama, kode mono, total earned, available, withdrawn.
   Tabel desktop dipertahankan dengan `hidden sm:block`.

### Tidak diubah
- Logika RPC, dialog Setujui/Tolak/Tandai Bayar/Detail, realtime, RLS, schema.
- Tampilan desktop (≥640px) tidak berubah secara visual.
- KPI cards di atas tab juga tidak diubah (sudah responsif 2-kolom mobile).

### File yang disentuh
- `src/components/admin/keuangan/ReferralManager.tsx` saja.
