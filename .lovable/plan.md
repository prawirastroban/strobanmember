# Audit Notifikasi Ganda di HP (terutama iPhone)

## Temuan (terverifikasi dari kode + data)

**1. Token lama masih dikirimi push (penyebab utama)**
Fungsi pengirim notifikasi mengambil SEMUA baris token milik user tanpa menyaring token yang sudah ditandai tidak berlaku (`invalidated_at`). Data menunjukkan satu user bisa punya 22 baris token untuk perangkat yang sama, dengan hanya 1 yang aktif. Log pengiriman 7 hari terakhir memperlihatkan pola: 1 notifikasi menghasilkan 2 pengiriman "sent" plus belasan "failed". Artinya beberapa token lama masih hidup dan menampilkan notifikasi yang sama di perangkat yang sama.

**2. Service worker menampilkan notifikasi dua kali**
`public/firebase-messaging-sw.js` punya dua jalur tampil: handler Firebase (`onBackgroundMessage`) dan handler `push` mentah. Keduanya memakai pencegah-duplikat, tetapi dengan kunci berbeda (`fcm:<id>` vs `push:<id>`), sehingga tidak saling mengenali dan notifikasi yang sama bisa tampil 2x. Di iOS ini paling terasa karena `renotify: true` memaksa banner muncul ulang.

**3. Beberapa notifikasi kembar di database**
Dalam 7 hari terakhir ada 6 kasus baris notifikasi dengan judul sama untuk user sama dalam kurang dari 10 detik. Jumlahnya kecil, tapi setiap baris memicu satu pengiriman push tersendiri.

Gabungan poin 1 dan 2 menjelaskan persis "3x notifikasi yang sama".

## Rencana Perbaikan

**A. Kirim hanya ke token aktif dan unik**
- Saring token: hanya yang belum di-invalidate.
- Deduplikasi per perangkat: kirim hanya token terbaru per (user, perangkat) bila ada beberapa yang aktif.
- Tetap catat hasil ke log pengiriman seperti sekarang.

**B. Bersihkan token lama sekali jalan**
- Tandai token lama (bukan token terbaru per perangkat, atau yang berulang kali gagal) sebagai tidak berlaku lewat migrasi satu kali. Riwayat tidak dihapus.

**C. Perbaiki service worker agar tampil sekali**
- Samakan kunci pencegah-duplikat antara jalur Firebase dan jalur push mentah (satu kunci per `notification_id`), dan lebarkan jendela dedupe.
- Sebelum menampilkan, cek notifikasi aktif dengan tag yang sama agar tidak menumpuk.

**D. Cegah baris notifikasi kembar**
- Tambahkan penjagaan idempoten pada pembuatan notifikasi berulang (lewati bila notifikasi identik untuk user yang sama dibuat kurang dari 30 detik lalu).

## Catatan Teknis
- File: `supabase/functions/dispatch-notification/index.ts` (filter token + dedupe per perangkat), `public/firebase-messaging-sw.js` (unifikasi kunci dedupe), migrasi pembersihan `push_tokens`, plus penjagaan idempoten di titik pembuatan notifikasi.
- iPhone PWA hanya menerima push dari domain produksi; setelah perbaikan, disarankan matikan lalu aktifkan lagi notifikasi di iPhone agar tersisa satu token bersih.