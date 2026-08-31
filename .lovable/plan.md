# Perbaikan Input Nomor WhatsApp: Opsi "Isi Nanti" + Pesan Error yang Jelas

## Temuan audit

- Error di layar ("Could not find the table 'public.profiles' in the schema cache") terjadi saat backend sedang mati/paused. Backend saat ini sudah kembali normal, jadi penyebabnya bukan kode — tetapi aplikasi tidak punya jalan keluar: nomor WhatsApp wajib, sehingga saat penyimpanan gagal pengguna terjebak di langkah 2/4 dan tidak bisa memakai aplikasi sama sekali.
- Wizard onboarding (langkah 2) hanya punya tombol "Lanjut" — tidak ada opsi melewati.
- Popup wajib WhatsApp (safety net) juga hanya punya "Simpan & Lanjutkan" atau "Keluar dari akun".
- Pesan error yang ditampilkan adalah pesan teknis mentah dari backend.

## Yang akan diubah

1. **Opsi "Isi nanti" di langkah WhatsApp** pada wizard onboarding — pengguna bisa lanjut ke langkah kendaraan/tur tanpa mengisi nomor.
2. **Opsi "Isi nanti" pada popup wajib WhatsApp** — menutup popup untuk sesi ini, muncul lagi maksimal sekali per hari, bukan mengunci akun.
3. **Pengingat tetap ada**: kartu "Checklist Akun" di beranda menampilkan item "Nomor WhatsApp" yang belum diisi, dan tetap diminta saat pengguna melakukan booking/checkout (titik di mana nomor benar-benar dibutuhkan).
4. **Penanganan gagal simpan yang ramah**: jika backend sedang bermasalah, tampilkan pesan "Server sedang sibuk, coba lagi sebentar" beserta tombol **Coba lagi**, dan tombol "Isi nanti" agar pengguna tidak terjebak.

## Rincian teknis

- `src/components/onboarding/OnboardingWizard.tsx`: tambah `canSkipStep` untuk `current === 1`; tombol "Isi nanti" memanggil `goto(2)` tanpa update `profiles.phone`. Tambah state `saveError` + tombol coba lagi.
- Pemetaan error: helper kecil yang mengubah error PostgREST (schema cache / network / 5xx) menjadi kalimat Bahasa Indonesia; simpan pesan teknis hanya di `console.error`.
- `src/components/WhatsAppRequiredGate.tsx`: ganti alur kunci-akun menjadi tombol "Isi nanti" yang menyimpan penanda `wa_gate_snoozed_until` (24 jam) di localStorage; tombol "Keluar dari akun" tetap ada sebagai opsi sekunder.
- `AccountChecklistCard` sudah membaca `hasPhone` dari `useOnboarding`, jadi pengingat otomatis muncul tanpa perubahan logika.
- Tidak ada perubahan skema database.
