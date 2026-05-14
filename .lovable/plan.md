Masalah utamanya ada di pembukaan link WhatsApp dari area preview, bukan di data customer atau proses reminder.

1. Verifikasi semua tombol follow-up WhatsApp yang masih membuka `wa.me`/`api.whatsapp.com` dari konteks preview/admin.
2. Ubah strategi pembukaan link agar keluar dari konteks embedded preview (mis. top-level navigation atau pola link yang aman untuk browser), khususnya di panel follow-up review.
3. Samakan perilaku tombol WA lain yang relevan supaya tidak ada kasus serupa di halaman admin.
4. Validasi bahwa klik tombol sekarang membuka WhatsApp Web/tab luar tanpa error `ERR_BLOCKED_BY_RESPONSE`.

Teknis:
- Saat tombol sekarang diklik, app membuka `https://wa.me/...`.
- WhatsApp me-redirect ke `https://api.whatsapp.com/send/...`.
- Endpoint itu mengirim header keamanan seperti `X-Frame-Options: DENY` / pembatasan `frame-ancestors`, sehingga browser menolak membukanya di konteks preview yang ter-embed.
- Jadi akar masalahnya adalah kebijakan keamanan browser + cara membuka link, bukan backend/database.