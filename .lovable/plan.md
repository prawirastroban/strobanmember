# Masalah

1. **Preview blank putih** dan **semua tombol WhatsApp membuka `about:blank`**.
2. Akar masalah ada di helper `src/lib/whatsapp.ts` (dibuat di iterasi sebelumnya):
   - `openWhatsApp()` memanggil `window.open("", "_blank", "noopener,noreferrer")` lebih dulu untuk membuka tab kosong, lalu mencoba `popup.location.replace(target)`.
   - Di dalam iframe preview Lovable, `window.open` **diblokir oleh sandbox/COOP** sehingga:
     - Tab baru hanya berisi `about:blank` (tidak pernah di-redirect).
     - Pada beberapa kasus `popup.location.replace` melempar exception cross-origin → tertangkap `try/catch` namun tab `about:blank` tetap terbuka.
   - Tombol non-link (`launchWhatsApp(...)` di `ReviewFollowUpPanel`, dsb.) yang murni mengandalkan `openWhatsApp` jadi selalu nyangkut di `about:blank`.
3. Preview blank kemungkinan besar terjadi karena pemanggilan `openExternalTab()` dieksekusi saat handler dijalankan dan beberapa browser memutus konteks iframe; ditambah anchor `<a href={waLink} onClick={handleWhatsAppNavigation}>` memanggil `event.preventDefault()` lalu mencoba `window.open` → klik dianggap "consumed" tapi nav gagal.

# Perbaikan (frontend-only, satu file)

Tulis ulang `src/lib/whatsapp.ts` agar:

1. **Buang strategi `window.open("", "_blank")` + `location.replace`.** Strategi tersebut yang menghasilkan `about:blank`.
2. **Gunakan URL `https://wa.me/<phone>?text=...`** (tetap), tapi navigasi dilakukan via **anchor injection** sederhana:
   ```ts
   const a = document.createElement("a");
   a.href = url;
   a.target = "_blank";
   a.rel = "noopener noreferrer";
   document.body.appendChild(a);
   a.click();
   a.remove();
   ```
   Ini diizinkan top-level navigation di iframe Lovable (sudah terbukti pada implementasi WA sebelumnya yang bekerja).
3. **`handleWhatsAppNavigation`** untuk anchor `<a href=...>`: **JANGAN** `preventDefault()` jika anchor sudah punya `href` valid + `target="_blank"`. Cukup biarkan browser yang menavigasi. Helper hanya menjadi fallback ketika `event` tidak ada (tombol/button murni).
   - Implementasi: jika `event` ada → biarkan default browser jalan (return true). Jika tidak ada event (mis. dipanggil dari `launchWhatsApp` di `ReviewFollowUpPanel`) → pakai anchor injection.
4. **Tetap ekspor API yang sama** (`buildWhatsAppUrl`, `openWhatsApp`, `handleWhatsAppNavigation`, `normalizeWhatsAppPhone`) sehingga 14+ file pemanggil tidak perlu diubah.

# QA

- Preview `/booking` tidak lagi blank.
- Klik tombol WA di:
  - `WhatsAppButton` (FAB hijau)
  - `ReviewFollowUpPanel` admin → tombol WA
  - `Hero`, `Footer`, `Profile`, `MyBooking`, `BookingStatus`, dll.
- Semua membuka tab baru langsung ke `wa.me/628...?text=...` (bukan `about:blank`).

# Catatan

- Tidak menyentuh logika bisnis, tidak ada migrasi DB, tidak menyentuh file lain.
- Jika browser user benar-benar memblokir popup, anchor injection tetap akan mengarahkan ke WA karena ini berasal dari user gesture langsung.
