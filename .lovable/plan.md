## Masalah

Saat akun **admin cabang** menekan "Simpan Bukti" pada dialog Upload Bukti Pembayaran (dashboard keuangan), muncul toast **"Unauthorized"**.

Penyebabnya: RPC `public.staff_submit_manual_payment_proof` hanya mengizinkan role `admin` dan `staff`. Role `admin_cabang` ditolak di awal fungsi sehingga aksi gagal walau file sudah ter-upload ke storage.

```sql
-- saat ini
SELECT (has_role(v_caller,'admin') OR has_role(v_caller,'staff')) INTO v_is_staff;
IF NOT v_is_staff THEN
  RETURN json_build_object('success', false, 'error', 'Unauthorized');
END IF;
```

## Perbaikan

Buat migration baru yang me-`CREATE OR REPLACE` fungsi `staff_submit_manual_payment_proof` dengan guard role yang juga menerima `admin_cabang` — selaras dengan perbaikan `confirm_booking` sebelumnya.

```sql
SELECT (
  has_role(v_caller,'admin')
  OR has_role(v_caller,'staff')
  OR has_role(v_caller,'admin_cabang')
) INTO v_is_staff;
```

Logika lain (upsert payment, insert proof, update booking, mark paid) tidak diubah — perilaku tetap: hanya merubah status pembayaran/booking sesuai pilihan "Tandai Lunas" pada dialog.

## Scope

- Hanya satu migration SQL baru.
- Tidak ada perubahan frontend (dialog dan handler sudah benar).
- Tidak menyentuh RPC lain atau RLS policy lain pada turn ini; jika ada aksi lain yang juga ditolak untuk admin cabang, akan ditangani terpisah agar perubahan tetap terbatas pada masalah yang dilaporkan.
