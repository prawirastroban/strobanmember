## Perubahan pada `src/components/WhatsAppRequiredGate.tsx`

1. **Auto-close setelah simpan berhasil**
   - Tambahkan state lokal `dismissed` (boolean).
   - Setelah `supabase.update` sukses & toast "Nomor WhatsApp tersimpan" tampil, set `dismissed = true` agar dialog tertutup seketika (tidak menunggu realtime profile sync).
   - Gabungkan ke kondisi `open`: `open = !!user && !loading && isMissing && !skip && !dismissed`.
   - Reset `dismissed` bila `isMissing` kembali true di masa depan (effect kecil).

2. **Tombol close "X" kecil di kanan atas**
   - Saat ini `DialogContent` memakai `[&>button]:hidden` untuk menyembunyikan tombol default. Hapus class itu sehingga tombol X bawaan shadcn muncul, lalu styling kecil (top-3 right-3) sudah default.
   - Klik X akan menutup dialog (set `dismissed = true`). Karena nomor WA tetap wajib, dialog akan muncul lagi pada navigasi/refresh berikutnya bila masih kosong — sesuai desain "wajib" tapi user bisa menutup sementara.
   - Hapus juga handler `onPointerDownOutside`/`onEscapeKeyDown`/`onInteractOutside` `preventDefault` agar konsisten (X, ESC, klik luar semua bisa menutup sementara). 

Tidak ada perubahan DB, RLS, atau file lain.
