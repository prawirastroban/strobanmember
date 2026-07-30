## 1. Perbaiki UI halaman Dashboard → Marketing → Banner Beranda

File: `src/components/admin/HomeBannerManager.tsx`

Masalah pada layout sekarang: baris banner memakai kombinasi `flex-wrap` + `ml-auto` untuk grup tombol, sehingga di lebar dashboard tertentu switch "Tampilkan teks"/"Aktif" dan tombol urutan/hapus terdorong ke tepi kanan dan tampak keluar dari kartu, sementara kolom teks menyisakan ruang kosong besar.

Perbaikan:
- **Kartu Pengaturan Slider**: rapikan jadi grid `sm:grid-cols-2 lg:grid-cols-3` dengan tinggi baris seragam (`items-stretch`), setiap kontrol dibungkus panel bertepi sendiri sehingga "Auto slide", "Durasi", dan "Jumlah slide tampil" sejajar rapi. Tambahkan satuan (detik) di dalam field dan teks bantu singkat di bawah tiap input.
- **Baris banner**: ganti struktur `flex-wrap + ml-auto` dengan grid dua kolom eksplisit — kolom kiri thumbnail (rasio 16:9, lebar tetap), kolom kanan `min-w-0` berisi input judul/subjudul (grid 2 kolom di ≥sm, 1 kolom di mobile), input link, lalu baris kontrol yang dipecah jadi dua grup terpisah (`grid gap-2 sm:flex sm:justify-between`) supaya switch dan tombol aksi tidak pernah meluber.
- Semua input diberi `Label` kecil di atasnya agar tidak terlihat kosong/transparan saat nilainya belum diisi.
- Tombol urut naik/turun/hapus dibungkus `flex-nowrap shrink-0` dengan tooltip judul, ukuran `size="icon"` konsisten.
- **Simpan Perubahan** dipindah jadi bar sticky di bawah kartu (`sticky bottom-0` dengan latar blur) plus indikator "perubahan belum disimpan" ketika ada edit lokal.
- Header "Daftar Banner": tombol "Tambah Banner" diberi jarak ikon-teks yang benar (saat ini ikon menimpa teks) dan `whitespace-nowrap`.
- Tetap memakai token desain semantik (tanpa warna hardcode) dan tetap responsif sampai lebar 320px.

Tidak ada perubahan logika data — query, upload, urutan, dan penyimpanan tetap sama persis.

## 2. Ubah tampilan banner paling atas di beranda

File: `src/components/mobile/home/HomeBannerSlider.tsx` (dan penempatannya di `src/components/mobile/home/HeroBookingForm.tsx` bila perlu)

Sesuai pilihan **"Kartu banner penuh (gambar jelas)"**:
- Slide jadi **kartu gambar rasio 16:9** dengan sudut membulat (`rounded-2xl`), margin samping, dan bayangan halus — bukan lagi latar hero yang tertutup overlay gelap penuh.
- Overlay gelap seluruh permukaan dihapus; diganti gradasi tipis hanya di sepertiga bawah agar teks tetap terbaca tapi gambar banner terlihat terang dan jelas.
- Teks judul/subjudul diposisikan di dalam kartu bagian bawah kiri, ukuran fluid, `break-words`, dan tetap dikontrol toggle "Tampilkan teks" per slide (slide tanpa teks tampil sebagai gambar polos).
- Label kecil "Solusi perawatan mobil anda" hanya muncul bila slide punya judul.
- Dot indikator dipindah ke dalam kartu (pojok bawah tengah) di atas gradasi.
- Autoplay, swipe, klik link, aria-label, dan fallback hero bawaan (saat belum ada banner) dipertahankan apa adanya.
- Konten hero lain (sapaan/booking) tetap di bawah kartu banner, jarak antar bagian dirapikan agar tidak dobel padding.

## Verifikasi
Screenshot beranda mobile (390px) dan desktop untuk memastikan kartu banner tampil jelas, serta pengecekan halaman pengaturan banner pada lebar 1345px dan 390px untuk memastikan tidak ada elemen yang keluar kartu.
