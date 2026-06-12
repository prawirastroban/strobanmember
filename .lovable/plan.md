## Tujuan
Menghilangkan notifikasi ganda/triple di notification center HP untuk event booking yang sama, tanpa merusak sistem notifikasi yang sudah berjalan.

## Yang akan saya ubah
1. Rapikan jalur kirim booking agar 1 event hanya punya 1 jalur push
   - Booking status sekarang berpotensi terkirim lewat 2 jalur sekaligus: insert ke `notifications` lalu dipush oleh dispatcher, dan direct push dari function booking status.
   - Saya akan jadikan satu sumber push saja, sementara jalur lain tetap dipakai hanya untuk channel yang memang perlu (mis. WhatsApp), supaya tidak dobel kirim.

2. Ubah payload web push supaya tidak auto-show + manual-show bersamaan
   - Saat ini browser/FCM bisa auto tampilkan notif, lalu service worker juga menampilkan notif lagi.
   - Saya akan ubah flow agar tampilan notifikasi background dikendalikan satu pintu saja oleh service worker.

3. Tambahkan dedupe/grouping yang benar per event
   - Setiap event akan punya kunci dedupe yang konsisten (`notification_id` / `group_key`).
   - Saya akan pakai grouping/collapse yang sinkron untuk Android, iOS, dan web supaya event yang sama tidak muncul 2–3 kartu terpisah.

4. Cegah 1 device aktif menerima token dobel
   - Saya akan cek registrasi token per device/install agar 1 HP tidak menyimpan beberapa token aktif untuk instalasi yang sama.
   - Jika ada token lama dari device yang sama, akan dinonaktifkan saat token baru sukses terdaftar.

5. Tambahkan guard anti-duplicate di service worker
   - Jika payload yang sama masuk lewat 2 callback berbeda, service worker hanya akan menampilkan 1 notifikasi.
   - Ini jadi lapisan pengaman terakhir walau provider/browser memicu event lebih dari sekali.

## File yang kemungkinan akan disentuh
- `public/firebase-messaging-sw.js`
- `src/hooks/useWebPush.ts`
- `supabase/functions/dispatch-notification/index.ts`
- `supabase/functions/notify-booking-status/index.ts`
- `supabase/functions/register-push-token/index.ts`
- migration baru untuk dedupe token / pengaturan trigger booking bila diperlukan

## Hasil yang dituju
- 1 booking baru = 1 kartu notifikasi di notification center HP
- tidak muncul 3 notifikasi identik seperti screenshot
- klik notifikasi tetap membuka halaman yang benar
- badge dan notification center tetap sinkron
- notifikasi event berbeda tetap masuk normal

## Detail teknis
- Hilangkan double-send antara trigger booking dan sender push.
- Pakai payload data-driven untuk web push background, lalu `showNotification()` hanya dari service worker.
- Samakan `tag` / `group_key` / collapse key / APNS thread atau collapse id agar event identik digabung, bukan digandakan.
- Tambahkan cache dedupe singkat di service worker berbasis `notification_id` atau kombinasi event key.
- Rapikan registrasi token agar satu instalasi/device tidak menyisakan token aktif berlebih.

## Validasi setelah implementasi
- Test 1 booking baru dari HP yang sama.
- Pastikan notification center HP hanya menampilkan 1 notifikasi untuk event itu.
- Ulangi test update status booking dan payment update untuk memastikan tidak spam.
- Pastikan in-app Notification Center tetap menerima row yang sesuai dan deep-link tetap benar.