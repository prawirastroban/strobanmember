## Masalah

Route `/spk/:id/print` di `src/App.tsx` sudah publik (tidak dibungkus `ProtectedRoute`), tapi halaman gagal menampilkan data untuk pengunjung anonim karena `SPKPrint.tsx` melakukan query langsung ke tabel:

- `spk_orders` — hanya punya policy SELECT untuk `authenticated` (staff/mekanik/customer pemilik booking). Tidak ada policy untuk `anon`.
- `spk_timeline` — sama, hanya untuk `authenticated`.
- `branches` — sudah punya policy publik (`is_active = true`), aman.

Akibatnya, saat kasir/pelanggan scan QR atau buka link share tanpa sesi login, halaman print kosong / terlihat butuh login.

## Tujuan

Link publik SPK (hasil `SPKShareCard` → `/spk/:id/print`) bisa dibuka siapa saja yang punya link/QR, tanpa perlu login akun apapun, tanpa membuka seluruh tabel `spk_orders` ke publik.

## Perubahan

### 1. Backend — RPC publik read-only

Tambah SECURITY DEFINER function `public.get_public_spk(p_id uuid)` yang mengembalikan satu JSON berisi ringkasan SPK yang aman ditampilkan di lembar cetak:

- Field `spk_orders` yang sudah tampil di PDF (`id`, `spk_number`, `status`, `data`, `service_date`, `time_start`, `time_end`, `mechanic_name`, `created_at`, dst — tanpa kolom internal sensitif).
- Data ringkas `branches` (nama, alamat, telepon) — sudah publik.
- Array `spk_timeline` yang relevan untuk tampilan riwayat.

Grant:

```sql
GRANT EXECUTE ON FUNCTION public.get_public_spk(uuid) TO anon, authenticated;
```

Tidak menambah policy baru di tabel — akses tetap via function saja. Ini menjaga model "punya UUID SPK = boleh lihat lembar cetak", identik dengan pola share link QR yang sudah dipakai untuk tracking booking publik.

### 2. Frontend — `src/pages/spk/SPKPrint.tsx`

- Ganti 3 query langsung (`spk_orders`, `branches`, `spk_timeline`) menjadi satu panggilan `supabase.rpc("get_public_spk", { p_id: id })`.
- Map hasil RPC ke state `spk`, `branch`, `timeline` yang sudah ada; struktur render tidak berubah.
- Tampilkan pesan "SPK tidak ditemukan" bila RPC mengembalikan null (tanpa memicu redirect ke login).

### 3. Verifikasi

- Buka `/spk/:id/print` di sesi anonim → data tampil, tombol Unduh PDF & Bagikan tetap jalan.
- Buka via `SPKViewDialog` (embed iframe) di dashboard staff → tetap tampil identik.
- Scan QR dari `SPKShareCard` di HP yang tidak login → tampil lembar SPK.

## Catatan teknis

- Route `/spk/:id/print` tidak diubah — sudah publik.
- Tidak ada perubahan pada policy RLS `spk_orders` / `spk_timeline`; akses tulis & daftar tetap terkunci.
- Halaman `/spk/:id/approve` tetap `ProtectedRoute` (butuh identitas customer untuk tanda tangan), tidak dalam scope perubahan ini.
