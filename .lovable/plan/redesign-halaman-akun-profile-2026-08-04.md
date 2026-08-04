# Redesign Halaman Akun (/profile)

Menyesuaikan halaman akun dengan mockup: kartu identitas mengambang di atas banner, poin servis + badge member, banner "Join STROBAN Premium Club", lalu menu dikelompokkan per kategori, dan tombol Logout merah penuh di bawah.

## Struktur baru (atas ke bawah)

```text
[ Banner ilustrasi (hero-bengkel.jpg, tinggi ~160px) ]
   +-------------------------------------------+
   |  (avatar)  Nama Merah        | Servis Poin |
   |            email             |   81 pt     |
   |            +62...            | [Basic Mbr] |
   +-------------------------------------------+
   |  Join STROBAN PREMIUM Club            >>  |  (gradient oranye-kuning)
   +-------------------------------------------+

Profil saya
  - Riwayat Servis Mobil        >   (/profile/history-perawatan)
  - Kendaraan Saya              >   (/my-vehicles)

Promo dan Hadiah
  - Saldo Stroban               >   (/referral)
  - Poin Servis                 >   (/loyalty)
  - Voucher Saya                >   (/loyalty#voucher)
  - Program Referral            >   (/referral)

Lainnya
  - Bantuan & Pengaduan         >   (WhatsApp support)
  - Beri Rating                 >   (/feedback)
  - Kebijakan Privasi           >   (/legal/privacy)

[  LOGOUT  ]  tombol merah lebar
Versi aplikasi
```

## Detail visual

- Kartu identitas putih rounded-2xl dengan shadow, overlap ke banner (margin negatif), avatar bundar berbingkai merah, nama merah tebal, email & telepon abu.
- Kolom kanan dipisah garis vertikal: label "Servis Poin", angka poin merah besar, badge "Basic Member" abu (otomatis naik sesuai tier bila data tier tersedia).
- Ikon pensil kecil di pojok kanan atas kartu untuk membuka dialog edit profil (tetap seperti sekarang), tombol kamera pada avatar tetap.
- Judul grup ("Profil saya", "Promo dan Hadiah", "Lainnya") merah tebal ukuran kecil.
- Tiap grup = satu kartu putih dengan baris dipisah garis tipis, ikon kiri, label tebal hitam, chevron kanan.
- Banner Premium Club hanya tautan/CTA visual ke halaman loyalitas (belum ada flow berlangganan baru).

## Yang dipertahankan

- Semua logika data, upload avatar, dialog edit profil, konfirmasi logout, banner notifikasi, dan AppVersionBadge tidak berubah.
- Kartu referral lama dipindah ke baris menu "Program Referral" agar halaman ringkas seperti mockup; jika akun belum terverifikasi, baris referral menampilkan catatan kecil "perlu verifikasi".

## Catatan teknis

- File yang diubah: `src/pages/Profile.tsx` saja (plus komponen kecil baru bila perlu untuk baris menu).
- Poin diambil dari sumber loyalitas yang sudah ada (tabel poin yang dipakai halaman `/loyalty`); jika query gagal, tampil `0 pt`.
- Semua warna memakai token desain yang ada (primary merah), tanpa warna hardcoded.
- tambahkan dialog log out untuk memastikan user benar benar ingin log out atau tidak