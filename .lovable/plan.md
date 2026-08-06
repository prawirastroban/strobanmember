# Perbaikan Notifikasi Masih Dobel 2x

## Hasil verifikasi

- Database tidak membuat dua baris notifikasi identik dalam 24 jam terakhir, jadi duplikasi tersisa bukan berasal dari data notifikasi.
- Log pengiriman terbaru menunjukkan satu notifikasi masih dikirim dua kali ketika penerima memiliki dua token web aktif untuk tipe perangkat yang sama. Contoh terbaru mencatat `token_count: 2` dan dua respons FCM berhasil untuk satu `notification_id`.
- Kode lokal `dispatch-notification` sebenarnya sudah membatasi satu token per tipe perangkat, tetapi perilaku fungsi yang sedang berjalan belum mencerminkan kode tersebut. Artinya versi perbaikan perlu dipastikan terpasang pada backend.
- Service worker masih memiliki dua handler yang memanggil `showNotification()` sendiri, sementara payload FCM juga membawa `webpush.notification`. Browser/FCM dapat menampilkan payload tersebut otomatis, sehingga jalur manual dapat menghasilkan banner kedua—terutama pada iPhone PWA.
- Registrasi token yang terjadi hampir bersamaan masih dapat meninggalkan dua token aktif untuk kombinasi user/platform/tipe perangkat yang sama.

## Rencana perbaikan

1. **Hilangkan jalur tampilan ganda di service worker**
   - Jadikan FCM/browser sebagai satu-satunya penampil banner background untuk payload notifikasi.
   - Pertahankan handler klik, navigasi, badge, dan foreground event, tetapi jangan memanggil `showNotification()` lagi untuk payload yang sudah membawa notifikasi.
   - Sediakan fallback manual hanya untuk payload data-only, dengan dedupe berdasarkan `notification_id`.

2. **Pastikan satu pengiriman per instalasi/perangkat**
   - Perkuat `register-push-token` agar registrasi baru menonaktifkan token lama yang tersisih untuk perangkat yang sama.
   - Cegah dua proses registrasi paralel meninggalkan dua token aktif.
   - Pertahankan histori token; token lama ditandai tidak aktif, bukan dihapus.

3. **Pasang versi dispatcher terbaru**
   - Deploy ulang `dispatch-notification` dan `register-push-token` agar filter token aktif serta dedupe benar-benar berlaku di backend.
   - Bersihkan sekali lagi token aktif yang terduplikasi berdasarkan pasangan user/platform/tipe perangkat, menyisakan token terbaru.

4. **Validasi end-to-end**
   - Kirim satu notifikasi uji ke perangkat terdampak.
   - Verifikasi log menghasilkan tepat satu `trigger`, satu token target, dan satu hasil `sent` untuk `notification_id` tersebut.
   - Pastikan hanya satu banner muncul saat aplikasi background/layar terkunci, sementara foreground tetap hanya menghasilkan pengalaman in-app tanpa banner tambahan.

## Catatan teknis

- Area perubahan: `public/firebase-messaging-sw.js`, `supabase/functions/dispatch-notification/index.ts`, `supabase/functions/register-push-token/index.ts`, dan migrasi pembersihan token aktif ganda.
- Tidak mengubah isi, desain, atau tujuan notifikasi; hanya menyatukan jalur display dan pengiriman agar satu event menghasilkan satu banner.
