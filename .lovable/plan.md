
# Mobile Layout Redesign — Traveloka × Fresha Style

Saya siap membantu merombak layout mobile agar terasa seperti **Traveloka** (super-app, kategori cepat, promo carousel) dan **Fresha** (booking salon/jasa yang clean, kartu jasa rapi, jadwal cepat).

Sebelum mulai, saya butuh arahan spesifik dari Anda supaya hasilnya sesuai. Silakan jelaskan perubahan yang Anda inginkan — bisa per section atau sekaligus. Berikut **panduan area** yang biasanya diubah pada gaya Traveloka/Fresha, supaya Anda mudah menunjuk bagian mana yang mau dirombak:

## Area yang umumnya di-redesign

**1. Hero / Search Header (gaya Traveloka)**
- Header gradient + greeting ("Halo, [Nama] 👋")
- Search bar besar mengambang ("Cari layanan / ban / cabang...")
- Quick action chips di bawah search

**2. Quick Category Grid (gaya Traveloka icons)**
- Grid 4×2 atau 5×2 ikon bulat berwarna (Servis, Ban, Oli, Booking, Promo, dll.)
- Tap → langsung filter kategori atau buka section

**3. Promo / Banner Carousel**
- Auto-scroll banner promo full-width dengan dot indicator
- Card promo bergaya Traveloka (gradient + label diskon)

**4. Service Cards (gaya Fresha)**
- List vertikal kartu jasa dengan: foto kiri, nama + durasi + rating + harga, tombol "Pesan" kanan
- Section header "Layanan Populer" dengan link "Lihat semua"

**5. Upcoming Booking Card (gaya Fresha "Your appointment")**
- Card prominent di atas dashboard: tanggal besar, status badge, tombol "Lihat detail" + "Ubah jadwal"

**6. Bottom Sheet Booking (gaya Fresha)**
- Wizard booking pakai bottom sheet bertingkat, bukan full page
- Sticky CTA "Lanjutkan — Rp xxx" di bawah

**7. Branch Picker (gaya Traveloka location)**
- Card horizontal scroll dengan foto cabang, jarak, rating

**8. Section Spacing & Typography**
- Padding lebih lega, heading lebih besar (text-xl bold), warna section pemisah abu-abu lembut

---

## Mohon jawab sebelum saya buat plan implementasi:

**A. Section mana yang ingin diubah dulu?** (boleh pilih beberapa, atau "semua sekaligus")
- [ ] Hero + Search header
- [ ] Quick category grid
- [ ] Promo carousel
- [ ] Service cards (Fresha-style list)
- [ ] Upcoming booking card
- [ ] Booking wizard → bottom sheet
- [ ] Branch picker horizontal
- [ ] Lainnya (sebutkan)

**B. Apakah perubahan ini hanya untuk mobile (<768px)?** Atau juga tablet/desktop?

**C. Ada referensi visual?** (screenshot Traveloka/Fresha yang spesifik bisa Anda upload — sangat membantu menyamakan persepsi warna, radius, spacing)

**D. Apakah elemen existing boleh dihilangkan/diganti total?** Contoh: `StatsBanner`, `WhyChooseUs`, `Testimonials` — di Traveloka/Fresha biasanya tidak ada di home, diganti promo + kategori. Boleh kami sembunyikan di mobile?

Setelah Anda jawab (atau langsung tulis "ubah semua, ikut style Fresha"), saya akan susun plan implementasi detail per komponen + file yang akan diedit.
