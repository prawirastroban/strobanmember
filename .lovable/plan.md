## Tujuan
Setiap servis selesai memberi poin dengan rumus `floor(service_price / nilai_konversi)` — default `Rp 100.000 = 1 poin`. Servis di bawah nilai konversi tidak dapat poin sama sekali. Nilai konversi dapat diubah admin dari `/dashboard/marketing/rewards`.

## Perubahan database (migration baru)
1. Seed baris baru di `app_settings` dengan key `loyalty_earn_rate`:
   ```json
   { "rupiah_per_point": 100000 }
   ```
   (insert ... on conflict do nothing — tidak menimpa nilai admin yang sudah ada).
2. `CREATE OR REPLACE FUNCTION public.award_points_on_booking_complete()`:
   - Hanya jalan saat `NEW.status='completed'` dan `OLD.status` berbeda (perilaku saat ini dipertahankan).
   - Baca `rupiah_per_point` dari `app_settings` (fallback `100000` jika null/tidak ada).
   - `points_to_award := FLOOR(NEW.service_price / rupiah_per_point)::int`.
   - Jika `points_to_award <= 0` → `RETURN NEW` tanpa insert ke `loyalty_points` / `loyalty_transactions` (servis kecil tidak dapat poin).
   - Jika > 0 → upsert `loyalty_points` + insert `loyalty_transactions` (deskripsi mencantumkan harga + rate aktif).
   - Trigger `trg_award_points_on_booking_complete` tetap dipakai (tidak perlu drop).

Catatan: trigger pesanan ban (`trg_award_points_tire_order`, Rp 10.000 = 1 poin) tidak diubah — di luar permintaan user.

## Perubahan UI — `src/components/admin/RewardsManager.tsx`
Tambah Card baru di atas tab existing (atau di Tab "Rewards"), judul **"Konversi Poin Loyalty"**:
- Field: `CurrencyInput` "Nilai 1 Poin (Rp)" — value diambil dari `app_settings.loyalty_earn_rate.rupiah_per_point`.
- Helper text: *"Setiap kelipatan nilai ini dari harga servis = 1 poin. Servis di bawah nilai ini tidak mendapat poin."*
- Tombol **Simpan** → `supabase.from('app_settings').upsert({ key: 'loyalty_earn_rate', value: { rupiah_per_point: <num> }, updated_by: user.id }, { onConflict: 'key' })`.
- Validasi: minimal `1000`, integer.
- Toast sukses + refresh nilai.

Tidak ada perubahan komponen lain (LoyaltyPoints, RewardsStore, Loyalty page) — hanya rumus poin dan settingan baru.

## Verifikasi
1. Buka `/dashboard/marketing/rewards` → terlihat card "Konversi Poin Loyalty" berisi `Rp 100.000`.
2. Selesaikan booking Rp 350.000 → user dapat **3 poin** (cek `loyalty_transactions`).
3. Selesaikan booking Rp 80.000 → **0 poin**, tidak ada baris baru di `loyalty_transactions`.
4. Ubah nilai konversi jadi `Rp 50.000`, simpan, selesaikan booking Rp 80.000 → user dapat **1 poin**.
