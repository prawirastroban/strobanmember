-- Legal documents table
CREATE TABLE public.legal_documents (
  slug text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view legal documents"
ON public.legal_documents FOR SELECT
USING (true);

CREATE POLICY "Staff can insert legal documents"
ON public.legal_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update legal documents"
ON public.legal_documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Customer complaints table
CREATE TABLE public.customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  phone text,
  email text,
  category text NOT NULL DEFAULT 'umum',
  message text NOT NULL,
  attachment_url text,
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit complaints"
ON public.customer_complaints FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users view own complaints"
ON public.customer_complaints FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff view all complaints"
ON public.customer_complaints FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff update complaints"
ON public.customer_complaints FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Seed default legal documents
INSERT INTO public.legal_documents (slug, title, content) VALUES
('terms', 'Syarat & Ketentuan Penggunaan',
'1. PENERIMAAN KETENTUAN
Dengan mengakses dan menggunakan situs/aplikasi Sahabat Stroban Service ("Layanan"), Anda menyetujui untuk terikat oleh Syarat & Ketentuan ini.

2. AKUN PENGGUNA
- Anda bertanggung jawab atas keamanan akun dan kata sandi Anda.
- Data yang Anda berikan harus akurat dan terbaru.
- Akun yang terbukti palsu/menyalahgunakan layanan dapat dinonaktifkan tanpa pemberitahuan.

3. PEMESANAN SERVIS
- Pemesanan terikat pada slot waktu, kapasitas cabang, dan ketersediaan teknisi.
- Konfirmasi booking dilakukan oleh staf dan dapat dibatalkan jika data tidak valid.
- Perubahan jadwal (reschedule) dapat dilakukan minimal 1 jam sebelum slot.

4. PEMBAYARAN
- Pembayaran dilakukan melalui metode yang tersedia: Tunai, Transfer Bank, QRIS, atau Midtrans.
- Bukti pembayaran manual wajib diunggah dan akan diverifikasi staf.

5. PROGRAM POIN, VOUCHER, & REFERRAL
- Tunduk pada ketentuan masing-masing program yang ditampilkan pada halaman terkait.
- Poin/voucher tidak dapat ditukar uang tunai kecuali diatur khusus.

6. LARANGAN
Pengguna dilarang: (a) menyalahgunakan sistem, (b) memberikan data palsu, (c) melakukan tindakan yang merugikan perusahaan/pengguna lain.

7. PERUBAHAN KETENTUAN
Sahabat Stroban Service berhak mengubah ketentuan sewaktu-waktu. Perubahan berlaku saat dipublikasikan di halaman ini.

8. HUKUM YANG BERLAKU
Ketentuan ini tunduk pada hukum yang berlaku di Republik Indonesia.

9. KONTAK
WhatsApp: +62 897-3700-800 — www.bengkelstroban.com'),

('privacy', 'Kebijakan Privasi',
'Kebijakan Privasi ini menjelaskan bagaimana Sahabat Stroban Service mengumpulkan, menggunakan, dan melindungi data pribadi Anda sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).

1. DATA YANG KAMI KUMPULKAN
- Identitas: nama, email, nomor telepon, foto profil.
- Data kendaraan: merek, model, tahun, plat nomor.
- Data transaksi: riwayat booking, pembayaran, voucher, poin.
- Data teknis: IP, perangkat, log aktivitas (untuk keamanan).

2. TUJUAN PENGGUNAAN
- Memproses pemesanan & pembayaran servis.
- Mengirim notifikasi pengingat servis & promo.
- Meningkatkan kualitas layanan & keamanan akun.
- Memenuhi kewajiban hukum (faktur/invoice).

3. PENGUNGKAPAN DATA
Kami TIDAK menjual data Anda. Data hanya dibagikan kepada:
- Penyedia pembayaran (Midtrans) untuk memproses transaksi.
- Penyedia notifikasi (Resend/Twilio) untuk mengirim email/WA.
- Pihak berwenang jika diwajibkan oleh hukum.

4. PENYIMPANAN
Data disimpan pada infrastruktur cloud terenkripsi selama akun aktif + retensi sesuai kewajiban hukum (faktur min. 10 tahun).

5. HAK ANDA (UU PDP)
- Hak akses, perbaikan, dan penghapusan data.
- Hak menarik persetujuan.
- Hak mengajukan keberatan pemrosesan.
Permintaan dapat dikirim ke WhatsApp +62 897-3700-800.

6. KEAMANAN
Kami menerapkan kontrol akses berbasis peran, enkripsi data sensitif, dan audit log.

7. ANAK DI BAWAH UMUR
Layanan tidak ditujukan untuk anak di bawah 17 tahun.

8. PERUBAHAN KEBIJAKAN
Versi terbaru selalu tersedia di halaman ini.'),

('cookie', 'Kebijakan Cookie',
'Situs Sahabat Stroban Service menggunakan cookie dan teknologi serupa untuk meningkatkan pengalaman pengguna.

1. APA ITU COOKIE
Cookie adalah berkas kecil yang disimpan di perangkat Anda untuk mengingat preferensi & sesi.

2. JENIS COOKIE YANG KAMI GUNAKAN
- Cookie Sesi: menjaga Anda tetap login.
- Cookie Preferensi: bahasa, tema, cabang favorit.
- Cookie Analitik: memahami penggunaan halaman secara agregat.

3. COOKIE PIHAK KETIGA
- Google (Login OAuth & Analytics).
- Midtrans (proses pembayaran).
- Supabase (otentikasi & sesi).

4. PENGATURAN
Anda dapat menolak/menghapus cookie melalui pengaturan browser. Catatan: beberapa fitur (login, checkout) memerlukan cookie agar berfungsi.

5. PERSETUJUAN
Dengan terus menggunakan situs, Anda menyetujui penggunaan cookie sesuai kebijakan ini.'),

('refund', 'Kebijakan Pembatalan & Pengembalian Dana',
'1. PEMBATALAN BOOKING
- Pembatalan dapat dilakukan via menu "My Booking" minimal 1 jam sebelum slot.
- Pembatalan H-0 atau no-show dapat dikenakan biaya administrasi.

2. PENGEMBALIAN DANA (REFUND)
- Refund berlaku jika: pembayaran ganda, layanan tidak dapat diberikan oleh bengkel, atau kesalahan sistem.
- Refund TIDAK berlaku untuk: pembatalan sepihak setelah servis dimulai, perubahan keinginan, atau alasan non-teknis.
- Proses refund: 3-7 hari kerja ke rekening asal/saldo.

3. VOUCHER & POIN
- Voucher yang sudah digunakan tidak dapat dikembalikan.
- Voucher kadaluarsa tidak dapat diaktifkan kembali.
- Poin loyalty bersifat non-tunai dan tidak dapat dikembalikan dalam bentuk uang.

4. KOMPLAIN HASIL SERVIS
- Klaim garansi maksimal 7 hari sejak servis selesai dengan menunjukkan invoice.
- Klaim ditangani oleh tim teknis cabang terkait.

5. PROSEDUR PENGAJUAN
Hubungi WhatsApp +62 897-3700-800 atau ajukan via halaman Pengaduan dengan menyertakan: nomor invoice, tanggal, dan bukti pendukung.'),

('disclaimer', 'Disclaimer Layanan',
'1. KUALITAS LAYANAN
Sahabat Stroban Service berkomitmen memberikan layanan terbaik. Namun hasil servis dapat dipengaruhi oleh kondisi awal kendaraan, suku cadang yang tersedia, dan faktor pemakaian pasca-servis.

2. GARANSI SERVIS
- Garansi pengerjaan: 7 hari kerja sejak servis selesai.
- Garansi suku cadang: mengikuti garansi resmi dari pabrikan/distributor.
- Garansi GUGUR jika: kendaraan dimodifikasi pihak lain, dipakai di luar peruntukan, atau ada kerusakan akibat kecelakaan.

3. BATAS TANGGUNG JAWAB
- Bengkel tidak bertanggung jawab atas barang berharga yang ditinggal di kendaraan tanpa pemberitahuan.
- Risiko force majeure (banjir, kebakaran, kerusuhan) berada di luar tanggung jawab bengkel.
- Estimasi waktu & biaya bersifat indikatif dan dapat berubah setelah pemeriksaan.

4. INFORMASI HARGA & SUKU CADANG
Harga yang tercantum dapat berubah sewaktu-waktu mengikuti harga pasar suku cadang.

5. KONTEN PIHAK KETIGA
Tautan ke situs eksternal (Shopee, Tokopedia, sosial media) tidak menjadi tanggung jawab kami.'),

('faq', 'FAQ — Pertanyaan yang Sering Diajukan',
'BOOKING
Q: Bagaimana cara memesan servis?
A: Buka menu "Pesan Servis", pilih jenis layanan, cabang, tanggal, dan slot waktu, lalu konfirmasi.

Q: Apakah saya bisa mengubah jadwal?
A: Ya, melalui menu "My Booking" minimal 1 jam sebelum slot.

Q: Berapa lama servis dikerjakan?
A: Estimasi tertera saat memilih layanan. Anda dapat memantau progres di halaman "Live Progress".

PEMBAYARAN
Q: Metode pembayaran apa saja yang tersedia?
A: Tunai di cabang, Transfer Bank (manual), QRIS, dan Midtrans (kartu/e-wallet).

Q: Bagaimana jika transfer manual saya belum diverifikasi?
A: Unggah bukti transfer pada halaman pembayaran. Verifikasi maksimal 1x24 jam kerja.

POIN & VOUCHER
Q: Bagaimana cara mendapat poin loyalty?
A: Setiap transaksi servis lunas memberikan poin sesuai program berjalan.

Q: Apakah voucher bisa digabung dengan promo lain?
A: Tidak, hanya 1 voucher/promo per transaksi kecuali ditentukan lain.

REFERRAL
Q: Bagaimana program referral bekerja?
A: Bagikan kode referral Anda. Saat teman mendaftar & melakukan transaksi lunas, Anda mendapat poin sesuai pengaturan program.

AKUN
Q: Lupa kata sandi?
A: Klik "Lupa Kata Sandi" pada halaman Masuk; tautan reset dikirim ke email.

Q: Bagaimana menghapus akun?
A: Hubungi WhatsApp +62 897-3700-800 dengan permintaan penghapusan data.

CABANG
Q: Berapa cabang yang tersedia?
A: Lihat daftar lengkap pada halaman "Cabang".'),

('contact', 'Kontak & Pengaduan Pelanggan',
'Kami menghargai setiap masukan dan keluhan Anda. Silakan hubungi kami melalui kanal berikut:

WhatsApp Resmi: +62 897-3700-800
Website: www.bengkelstroban.com
Jam Operasional: Senin–Sabtu, 08:00–17:00 WIB

Untuk pengaduan formal yang ingin Anda dokumentasikan, gunakan formulir di bawah. Tim kami akan menindaklanjuti maksimal 2x24 jam kerja.');