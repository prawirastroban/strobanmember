## Pembersihan Branding Lovable (White-label)

Saya sudah memindai seluruh proyek. Hasilnya: **branding Lovable yang terlihat oleh pengguna sangat sedikit** — sebagian besar referensi "lovable" di kode adalah **infrastruktur internal** yang tidak terlihat user dan **wajib dipertahankan** agar aplikasi tidak rusak. Berikut pembagiannya.

### A. Yang akan dibersihkan (user-facing)

1. **`index.html`** — hapus `og:image` & `twitter:image` yang masih menunjuk ke `https://lovable.dev/opengraph-image-...`. Akan dibiarkan kosong (rekomendasi: tanpa og:image lebih baik daripada placeholder asing). Title, description, canonical, theme-color sudah bersih ber-brand "Bengkel Stroban".
2. **`README.md`** — file ini masih boilerplate Lovable (judul "Welcome to your Lovable project", link `lovable.dev/projects/...`, dsb). Akan diganti total dengan README netral berisi nama proyek, stack, dan cara menjalankan secara lokal.
3. **Badge "Edit with Lovable"** pada deployment publik — sudah dalam keadaan **hidden** (`hide_badge: true`). Tidak perlu tindakan tambahan.
4. **Footer aplikasi** — sudah dicek (`src/components/Footer.tsx`, `BottomNav.tsx`): **tidak ada** teks "Powered by Lovable" atau watermark. Sudah bersih.
5. **Favicon** — `public/favicon.ico` sudah custom (bukan favicon Lovable). Sudah bersih.

### B. Yang TIDAK boleh dihapus (infrastruktur — bikin aplikasi rusak)

Referensi "lovable" berikut adalah komponen platform yang menjalankan fitur produksi. Menghapusnya akan mematikan login Google, AI chat, dan build:

- `package.json` → dependency `@lovable.dev/cloud-auth-js` (Google OAuth) & `lovable-tagger` (build tooling)
- `vite.config.ts` → `componentTagger` dari `lovable-tagger`
- `src/integrations/lovable/index.ts` → wrapper OAuth (auto-generated, dipakai LoginDialog/Auth)
- `src/components/LoginDialog.tsx`, `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/AuthCallback.tsx` → memakai OAuth wrapper di atas; hanya berisi import dan komentar internal yang **tidak terlihat user**
- `supabase/functions/chat/index.ts`, `supabase/functions/service-consultation/index.ts` → memakai **Lovable AI Gateway** (`ai.gateway.lovable.dev`) untuk asisten Gemini. Endpoint dan API key wajib dipertahankan agar Chat Assistant tetap jalan.
- `capacitor.config.ts` → `appId` Capacitor (`app.lovable.b619a7db...`) sudah dipakai untuk identitas native app & push token; mengubahnya membutuhkan re-publish ulang ke Play Store/App Store dan invalidate semua push token tersimpan. Tetap dipertahankan kecuali Anda memutuskan ganti `appId` resmi sebelum rilis store.
- `src/lib/whatsapp.ts` → hanya 1 baris komentar (`Lovable preview iframe`). Tidak terlihat user, tidak diubah.

### C. Ringkasan perubahan file

```text
index.html        - hapus 2 meta og:image / twitter:image
README.md         - tulis ulang netral (Bengkel Stroban)
```

Setelah ini, **tidak ada satupun teks/logo/link bertuliskan "Lovable" yang muncul ke pengguna akhir**, baik di UI maupun di metadata HTML. Komponen internal (OAuth, AI Gateway, build tooling, Capacitor appId) tetap berfungsi normal.

### Catatan penting untuk Anda

- Jika Anda ingin mengganti **Capacitor `appId`** ke domain resmi sendiri (mis. `id.bengkelstroban.app`) sebelum publish ke Play/App Store, sebutkan — itu perubahan terpisah yang perlu rebuild native bundle.
- Jika nanti ingin punya **og:image** kustom (preview saat dibagikan ke WhatsApp/FB), saya bisa generate satu pakai imagegen — tinggal minta.
