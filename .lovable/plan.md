# Perbaikan Hasil Audit UX (Aman, Tanpa Ubah Flow & Logic)

Laporan audit memberi skor 7.0/10 dengan 81 temuan. Sebagian temuan adalah salah-baca crawler (mis. "kontras 1:1" pada teks hero di atas gambar, "tidak ada testimoni/kontak" padahal komponen `Testimonials`, `WhyChooseUs`, dan `Footer` sudah ada, dan "tidak ada cookie banner" padahal `CookieConsentBanner` ada). Rencana ini hanya mengambil temuan yang valid dan bisa diperbaiki murni di lapisan tampilan — tanpa perubahan alur, data, atau logika bisnis.

## Tahap 1 — Aksesibilitas dasar (risiko sangat rendah)
- Tambah skip-link "Lewati ke konten" sebagai elemen fokus pertama, tersembunyi sampai difokus, menuju `#main` (sudah ada di halaman utama). Tambahkan `id="main"` pada halaman lain yang belum punya.
- Tambah gaya `:focus-visible` global (ring memakai token warna) agar fokus keyboard selalu terlihat, termasuk pada elemen yang kini memakai `outline:none`.

## Tahap 2 — Target sentuh & kontras footer
- Link legal/menu di `Footer.tsx` saat ini hanya setinggi 16px. Tambah padding vertikal (area sentuh ≥ 24–44px) dan naikkan warna dari `text-background/60` ke `/80` agar lolos kontras 4.5:1. Tata letak tetap sama.
- Naikkan area sentuh tombol ikon kecil (36×36) di navbar/bottom nav ke minimal 44×44 lewat padding transparan, tanpa mengubah ukuran ikon.

## Tahap 3 — Ukuran teks minimum
- Audit teks 9–11px pada kartu/badge di home dan katalog; naikkan ke minimal 12px (14–16px untuk paragraf) dan line-height ≥ 1.4. Hanya kelas Tailwind, tanpa perubahan struktur.

## Tahap 4 — Popup saat load
- Audit menyebut modal menutupi hero saat halaman dibuka (promo popup, jeda 400 ms). Opsi aman: naikkan jeda menjadi ±3 detik atau tampilkan setelah scroll pertama. Aturan frekuensi dan isi popup tidak diubah.

## Tahap 5 — Empty state & gambar
- Tambah empty state ringkas (ikon + satu kalimat + tombol) untuk daftar/grid yang bisa kosong (promo, voucher, riwayat) — hanya render kondisional saat data kosong, query tidak disentuh.
- Tambah `width`/`height` dan `loading="lazy"` pada gambar yang ditampilkan jauh lebih kecil dari resolusi aslinya.

## Yang sengaja tidak dikerjakan
- "Zero trust signals", "no dark mode", "no cookie consent", "no search": sudah tersedia di aplikasi; temuan crawler tidak akurat.
- Saran "kurangi border-radius" dan "ubah gaya kartu": bertentangan dengan identitas visual liquid glass yang sudah disepakati.
- Penulisan ulang copy untuk skor keterbacaan: butuh keputusan konten Anda.

## Catatan teknis
File yang tersentuh: `src/index.css` (skip-link + focus ring), layout/`App.tsx` untuk skip-link, `src/components/Footer.tsx`, `src/components/Navbar.tsx`, `src/components/BottomNav.tsx`, `src/hooks/usePromoPopups.ts` (hanya nilai jeda), dan komponen daftar terkait. Tidak ada perubahan database, edge function, maupun rute.