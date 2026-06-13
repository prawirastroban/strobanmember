# Legacy Page Audit & Archive System

Pendekatan: tidak menghapus apa pun dari database / endpoint / fitur aktif. Hanya merapikan source code frontend, mengarsipkan halaman yang sudah tidak dipakai, memastikan semua URL lama otomatis redirect ke pengganti, dan menampilkan laporan audit untuk Owner.

---

## 1. Hasil Audit Awal (current state)

### Route publik (`src/App.tsx`)
| URL | Status | Catatan |
|---|---|---|
| `/`, `/promo`, `/cabang`, `/katalog`, `/auth`, `/auth/callback`, `/reset-password`, `/reset-password-wa`, `/legal/:slug`, `/review/:token`, `/feedback` | ACTIVE | Dipakai navbar/footer/SEO |
| `/booking`, `/booking/status/:id`, `/service/progress/:id`, `/service/completed/:id`, `/my-booking/:id`, `/payment/manual/:id`, `/invoice/:id` | ACTIVE | Alur booking inti |
| `/my-vehicles`, `/my-vehicles/:id`, `/profile`, `/profile/history-perawatan`, `/loyalty`, `/cashback-history`, `/referral`, `/reminder-service`, `/notifications` | ACTIVE | Dilink dari Profile/Bell/Booking |
| `/profile/history` (`ServiceHistory.tsx`) | DEPRECATED | Tidak ada link internal sama sekali — sudah digantikan `/profile/history-perawatan` (`HistoryPerawatan.tsx`) |
| `/checkout`, `/checkout-coming-soon` | REDIRECTED | Sudah `<Navigate to="/booking">` |

### Route dashboard (`src/pages/Admin.tsx`)
| URL | Status |
|---|---|
| Semua route yang dipakai sidebar (`/dashboard`, `/dashboard/bookings`, `crm`, `slots`, `customers`, `marketing/*`, `keuangan/*`, `reports*`, `branches`, `legal`, `audit-log`, `pwa-settings`, `app-version`, `complaints`, `correction-requests`, `feedback`, `history`, `analytics`, `pickup-settings`) | ACTIVE |
| `/dashboard/test-transactions`, `/dashboard/feedback/internal` | ACTIVE (hidden) — owner-only utilities, tidak di sidebar |
| `/dashboard/scanner`, `/dashboard/inventory`, `/dashboard/roles`, `/dashboard/services`, `/dashboard/loyalty`, `/dashboard/rewards`, `/dashboard/branding`, `/dashboard/user-verification`, `/dashboard/users`, `/dashboard/payments`, `/dashboard/reports` (duplicate redirect), `/dashboard/keuangan`, `/dashboard/keuangan/payment` | REDIRECTED | Sudah `<Navigate>` ke pengganti |
| `/admin/*`, `/staff-setting` | REDIRECTED | Sudah ke `/dashboard` |

### Legacy components (file ada, route tidak)
- `src/components/admin/FinanceDashboard.tsx` — tidak diimpor di mana pun. Kandidat ARCHIVED.

### Duplicate findings
- **Resolved:** `/profile/history` vs `/profile/history-perawatan` (sama fungsi: riwayat servis pelanggan). Pemenang: `/profile/history-perawatan`.
- Tidak ada duplikat lain yang signifikan.

### Sidebar / Search
- Tidak ada Global Search / cmdk → bagian "Search Cleanup" otomatis tercukupi (sidebar adalah satu-satunya entry point).
- Sidebar (`getSidebarSections`) sudah mem-filter via `hideInSidebar` + role. Tidak ada item legacy yang muncul.

---

## 2. Yang Akan Dikerjakan

### A. Page Registry — single source of truth
Buat `src/config/pageRegistry.ts`:

```ts
export type PageStatus = "ACTIVE" | "ARCHIVED" | "DEPRECATED" | "REDIRECTED";
export interface PageEntry {
  path: string;          // route pattern
  title: string;
  status: PageStatus;
  replacedBy?: string;   // target untuk REDIRECTED/DEPRECATED
  scope: "public" | "auth" | "dashboard";
  notes?: string;
}
export const pageRegistry: PageEntry[] = [ /* semua route dari App.tsx & Admin.tsx */ ];
```

Tujuan: dipakai oleh (i) panel laporan audit, (ii) `LegacyRedirect` wrapper, (iii) test/manual review berikutnya. Tidak menggantikan React Router — hanya metadata.

### B. Archive halaman yang tidak terpakai
- `mv src/pages/ServiceHistory.tsx → src/pages/_archive/ServiceHistory.tsx` (folder `_archive/` adalah konvensi "developer-only — jangan diimpor di App").
- `mv src/components/admin/FinanceDashboard.tsx → src/components/admin/_archive/FinanceDashboard.tsx`.
- Tambahkan header komentar di tiap file arsip: `// @archived YYYY-MM-DD — replaced by <new>. Do not re-import.`
- Tambahkan `.eslintrc` override / komentar README di `_archive/` agar developer tahu file ini bukan dead code untuk dihapus, melainkan referensi.

### C. Force-redirect URL lama (`LegacyRedirect` wrapper)
Komponen kecil `src/components/LegacyRedirect.tsx`:
```tsx
function LegacyRedirect({ to, notify = true }: { to: string; notify?: boolean }) {
  useEffect(() => {
    if (notify) toast({ title: "Halaman telah diperbarui ke versi terbaru." });
  }, []);
  return <Navigate to={to} replace />;
}
```
- Ganti route `/profile/history` di `App.tsx` dari `<ServiceHistoryPage/>` → `<LegacyRedirect to="/profile/history-perawatan"/>`. Hapus import-nya.
- Existing `<Navigate>` di App.tsx & Admin.tsx (legacy /admin, /checkout, /dashboard/scanner, /dashboard/inventory, /dashboard/roles, /dashboard/services, /dashboard/loyalty, /dashboard/rewards, /dashboard/branding, /dashboard/user-verification, /dashboard/users, /dashboard/payments, /dashboard/keuangan, /dashboard/keuangan/payment) tetap pakai `<Navigate>` polos (tanpa toast) karena sudah diam-diam berfungsi dan tidak ingin spam toast tiap kali user klik link internal lama. Toast hanya untuk halaman yang user mungkin punya bookmark lama-nya.

### D. Catch-all dashboard
Tambahkan baris terakhir di `src/pages/Admin.tsx`:
```tsx
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```
Saat ini route dashboard yang tak dikenal jatuh ke global `NotFound` — diganti agar selalu kembali ke /dashboard (sesuai aturan "tanpa page not found" untuk URL lama dashboard).

### E. SEO noindex untuk halaman deprecated/archived
Untuk route yang masih ter-mount (`/profile/history` sebelum redirect berjalan tidak ada lagi, jadi tidak perlu meta). Untuk halaman publik tidak ada yang dideprecate, jadi tidak ada perubahan `index.html` / `SEOMeta.tsx`. (Jika nanti muncul halaman publik baru yang di-deprecate, registry akan men-supply `<meta name="robots" content="noindex">` lewat `SEOMeta`.)

Tambahkan dukungan di `src/components/SEOMeta.tsx`: jika `pageRegistry` menandai pathname sekarang sebagai `DEPRECATED|ARCHIVED` → suntik `<meta name="robots" content="noindex">` lewat existing mekanisme `document.title` mutation (atau tambah `<meta>` programatik). Mengaktifkan fitur tanpa data konkret saat ini.

### F. Owner-only audit report panel
Route baru hidden: `/dashboard/page-audit` (Owner-only, tidak di sidebar — diakses dari Versi Aplikasi page atau direct URL). Komponen `src/components/admin/PageAuditPanel.tsx`:
- Membaca `pageRegistry`.
- Menampilkan kartu KPI: Total / Active / Archived / Deprecated / Redirected / Duplicate Found / Duplicate Resolved.
- Tabel detail per page dengan kolom: Path, Title, Status, ReplacedBy, Scope, Notes.
- Tombol "Export CSV" sederhana.
- Tambahkan satu tile "Audit Halaman" di `AppVersionManager.tsx` (sudah Owner-only) yang link ke `/dashboard/page-audit`. Tidak ditambahkan ke `dashboardMenu.ts` (sesuai aturan "user tidak boleh akses dari menu" — tapi Owner tetap bisa via link dari halaman App Version).

### G. Tidak berubah
- Database, RLS, edge functions, hooks bisnis: tidak disentuh.
- Komponen sidebar (`AdminSidebar.tsx`), `dashboardMenu.ts`: tidak diubah strukturnya (sudah bersih sebelum audit ini).
- Semua link aktif di navbar/footer/profile: tidak diubah.

---

## 3. File yang Akan Dibuat / Diedit / Dipindah

**Created**
- `src/config/pageRegistry.ts`
- `src/components/LegacyRedirect.tsx`
- `src/components/admin/PageAuditPanel.tsx`
- `src/pages/_archive/README.md` (penjelasan konvensi arsip)
- `.lovable/memory/architecture/page-audit-system.md` (memory baru)

**Edited**
- `src/App.tsx` — ganti `/profile/history` route ke `LegacyRedirect`, hapus import `ServiceHistoryPage`.
- `src/pages/Admin.tsx` — tambah `<Route path="*">` catch-all redirect ke `/dashboard`; tambah route hidden `/dashboard/page-audit`.
- `src/components/SEOMeta.tsx` — auto-inject `noindex` bila pathname terdaftar sebagai DEPRECATED/ARCHIVED di registry.
- `src/components/admin/AppVersionManager.tsx` — tambah tile/link ke "Audit Halaman".
- `.lovable/memory/index.md` — tambahkan referensi memory baru.

**Moved (archived, tidak dihapus)**
- `src/pages/ServiceHistory.tsx` → `src/pages/_archive/ServiceHistory.tsx`
- `src/components/admin/FinanceDashboard.tsx` → `src/components/admin/_archive/FinanceDashboard.tsx`

---

## 4. Laporan Audit (yang akan tampil di panel & dilaporkan ke user setelah build)

```
Total Pages:              48
Active Pages:             36
Archived Pages:            2  (ServiceHistory.tsx, FinanceDashboard.tsx)
Deprecated Pages:          0  (semua deprecated dipindah ke REDIRECTED)
Redirected Pages:         10
Duplicate Pages Found:     1  (/profile/history ↔ /profile/history-perawatan)
Duplicate Pages Resolved:  1
```

(Angka final akan diperbarui di response setelah implementasi.)

---

## 5. Ketentuan yang dijamin
- Tidak menghapus database, endpoint, atau fitur aktif.
- Semua URL lama (bookmark / history browser) tetap dapat dibuka → otomatis redirect ke versi terbaru, tanpa blank page / 404.
- User tidak punya jalur (menu, link, sidebar) untuk mencapai halaman archived/deprecated.
- File arsip tetap tersedia untuk developer di folder `_archive/`.
- Owner punya panel `/dashboard/page-audit` untuk memantau status semua page.
