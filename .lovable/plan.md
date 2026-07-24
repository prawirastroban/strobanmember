## Masalah yang diverifikasi

1. **Link share masih meminta login Lovable.** `SPKShareCard.tsx` membangun URL dari `window.location.origin`. Saat admin membuka aplikasi di preview dev Lovable (`id-preview--*.lovable.app`), link yang dibagikan ikut memakai host itu — dan host preview memang dilindungi login akun Lovable. Bukan RLS Supabase (RPC `get_public_spk` sudah SECURITY DEFINER + grant `anon`, sudah benar).
2. **Belum ada live tracking SPK.** `/spk/:id/print` sekarang hanya sekali fetch, tanpa progres pengisian dan tanpa auto-refresh — beda dengan `PublicBookingTracker` (`/t/:token`) yang punya progress bar + poll 20 detik.

## Tujuan

- Link/QR SPK selalu mengarah ke domain publik produksi sehingga konsumen tidak pernah kena wall login Lovable.
- Konsumen bisa memantau progres pengisian SPK secara live (tanpa login), mirip pengalaman live tracking booking.
- Flow "klaim aktivasi akun" tetap terpisah dan tidak berubah (`/claim/:token`).

## Perubahan

### 1. Link share pakai domain publik, bukan origin preview

`src/components/spk/SPKShareCard.tsx` dan `src/pages/spk/admin/SPKAllList.tsx` (dan `SPKViewDialog` bila membangun URL) diubah agar `shareUrl` selalu memakai `WEB_BASE_URL` (`https://www.bengkelstroban.com`) dari `src/lib/platform.ts`, kecuali sedang berjalan di host publik yang sah (`bengkelstroban.com`, `www.bengkelstroban.com`, `strobanmember.lovable.app`) — dalam kasus itu boleh pakai `window.location.origin`. Iframe preview di `SPKViewDialog` tetap memakai path relatif `/spk/:id/print?embed=1` (same-origin, tidak dibagikan ke customer).

### 2. Halaman live tracking publik `/spk/:id/track`

Tambah route baru **publik** di `src/App.tsx`: `/spk/:id/track` → komponen baru `src/pages/spk/SPKPublicTracker.tsx`. Mengikuti pola `PublicBookingTracker.tsx`:

- Fetch via RPC `get_public_spk` yang sudah ada (anon-friendly).
- Auto-poll tiap 15 detik saat tab visible + subscribe realtime tidak dipakai (agar tetap anon; polling cukup).
- UI ringkas mobile-first:
  - Header: nomor SPK, nama customer, kendaraan, cabang, waktu buka.
  - **Progress bar 4 tahap** berdasarkan `spk.status` (Draft → Persetujuan Customer → Pengerjaan Mekanik → Selesai) — mapping status ada di `useSPKWorkflow`.
  - **Ringkasan progres pengisian** dihitung dari `spk.data` (jumlah item pemeriksaan terisi vs total via helper baru `computeSpkFillProgress` di `src/lib/spk/spkProgress.ts`) → "Pemeriksaan 12/34 item".
  - **Timeline live** dari `payload.timeline` memakai `describeEvent` yang sudah ada.
  - Tombol: "Lihat / Unduh Lembar SPK" → link ke `/spk/:id/print`, "Hubungi Bengkel" → WhatsApp support.
  - Noindex meta seperti `PublicBookingTracker`.
- Tampilkan state kosong "SPK tidak ditemukan" tanpa redirect login.

### 3. Share card mengarahkan ke tracker, bukan langsung print

`SPKShareCard.tsx`:
- Link publik dan QR memakai `/spk/:id/track` (live tracking) sebagai default.
- Tambah tombol sekunder "Lembar SPK (PDF)" yang menyalin link `/spk/:id/print`.
- Pesan WhatsApp diubah menjadi:
  ```
  Pantau progres SPK Anda secara live:
  {WEB_BASE_URL}/spk/{id}/track
  ```
  + baris tambahan untuk link cetak.

### 4. Verifikasi

- Buka `/spk/:id/track` di sesi anonim di `www.bengkelstroban.com` → progress + timeline tampil, refresh otomatis.
- Buka link share hasil `SPKShareCard` dari sesi admin di preview Lovable → URL yang tersalin adalah `https://www.bengkelstroban.com/spk/:id/track`, dapat dibuka di browser tanpa akun apa pun.
- Scan QR dari HP tanpa login → tracker terbuka.
- Tombol "Lembar SPK (PDF)" → `/spk/:id/print` tetap publik, unduh & bagikan PDF jalan.
- `/claim/:token` tidak disentuh.

## Catatan teknis

- Tidak ada perubahan RLS/tabel; hanya reuse RPC `get_public_spk`.
- `WEB_BASE_URL` sudah ada di `src/lib/platform.ts` — tinggal dipakai untuk link share.
- `spkProgress.ts` menghitung fill ratio berdasarkan key inspeksi yang sudah didefinisikan di `spkDisplayMap.ts` (engine, ac, suspension, tyre, lamps, electrical) — item dihitung "terisi" bila status ∈ {ok, warn, not, na}.
- Route `/spk/:id/print` tetap publik dan tidak diubah perilakunya.
