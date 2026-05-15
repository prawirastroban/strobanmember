## Tujuan

Tambahkan entry "Kirim Feedback" di sidebar (DesktopSidebar) yang membuka **pop-up Dialog** berisi form feedback/bug report. Bisa diakses semua user (login maupun guest), khusus untuk mengisi & mengirim — tanpa navigasi ke halaman `/feedback`.

## Perubahan

**1. `src/components/DesktopSidebar.tsx`**
- Tambahkan state `feedbackOpen`.
- Sisipkan section baru "Bantuan" (di atas atau di bawah "Preferensi") berisi 1 item button:
  - Icon `MessageSquare` (atau `MessageSquareWarning`) + label **"Kirim Feedback"**
  - onClick: tutup sheet sidebar lalu set `feedbackOpen=true`.
- Render `<Dialog>` baru di akhir komponen yang membungkus `<PublicFeedbackForm />`:
  - Title: "Kirim Feedback / Laporkan Bug"
  - Description singkat: "Sampaikan masukan, revisi, atau bug yang Anda temukan."
  - `max-w-lg`, scrollable (`max-h-[90vh] overflow-y-auto`).
  - Setelah submit sukses, dialog otomatis tertutup (lewat callback `onSubmitted`).

**2. `src/components/feedback/PublicFeedbackForm.tsx`**
- Tambahkan optional prop `onSubmitted?: () => void` yang dipanggil setelah submit berhasil (selain toast). Tidak mengubah perilaku existing di halaman `/feedback`.

## Catatan
- Tidak menyentuh halaman `/feedback`, footer link, edge function, RLS, atau tabel — hanya UI shell untuk akses cepat dari sidebar.
- Akses universal: tombol selalu tampil di sidebar baik user login maupun guest. Form sendiri sudah mendukung guest (auto-fill jika login).
- Scope hanya **DesktopSidebar** sesuai elemen yang dipilih user. Jika nanti ingin entry serupa di mobile bottom nav / MobileMenu, dapat ditambah di iterasi berikutnya.