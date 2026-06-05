# Gabungkan Audit Log, Permintaan Koreksi, & Bug Masukan

## Tujuan
Merampingkan sidebar dengan menggabungkan 3 item top-level menjadi 1 menu induk yang berisi 3 submenu (pola yang sama dipakai CRM, Marketing, Keuangan, Daftar Laporan).

## Perubahan

### 1. `src/components/admin/AdminSidebar.tsx`
Hapus 3 entri terpisah:
- `Audit Log` → `/dashboard/audit-log`
- `Permintaan Koreksi` → `/dashboard/correction-requests`
- `Bug & Masukan` → `/dashboard/feedback`

Ganti dengan 1 menu induk collapsible:

```
Kepatuhan & Masukan  (icon: ShieldCheck)
├─ Audit Log              → /dashboard/audit-log            (owner)
├─ Permintaan Koreksi     → /dashboard/correction-requests  (owner)
└─ Bug & Masukan          → /dashboard/feedback             (semua)
```

Posisi: tetap sebelum "PWA & Install" (di bawah "Legal & Dokumen").

Karena menu induk berisi submenu owner + submenu untuk semua role, induknya **tidak** diberi `requiredRole`. Filter per-child sudah ada di logic sidebar (children dengan `requiredRole` akan otomatis disembunyikan untuk role yang tidak sesuai). Bila setelah filter semua child kosong, menu induk juga akan disembunyikan oleh logic yang ada.

### 2. Routing (`src/pages/Admin.tsx`)
**Tidak berubah** — semua URL `/dashboard/audit-log`, `/dashboard/correction-requests`, `/dashboard/feedback` tetap aktif persis seperti sekarang. Hanya tampilan sidebar yang dirampingkan, tidak ada perubahan fungsional, halaman, route, atau permission.

## Yang tidak diubah
- Komponen halaman (`AuditLogPanel`, `CorrectionRequestsPanel`, `FeedbackControlCenter`)
- Route, URL, deep-link, bookmark lama
- Role check, RLS, edge functions
- Menu lain di sidebar
