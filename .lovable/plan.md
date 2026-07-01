## Tujuan
Merampingkan **System Management Hub** dari **13 tab** menjadi **5 grup fungsional**, menyembunyikan panel yang pasif/duplikat, dan memperbaiki flow supaya operator langsung tahu urutan kerja: **Deploy → Monitor → Kontrol → Audit**.

## Analisa Tab Saat Ini (13 tab)

| Tab | Status | Penilaian |
|---|---|---|
| Dashboard | Aktif | Overview KPI — **pertahankan sebagai landing** |
| Versi Aplikasi | Aktif | Utama untuk rilis |
| Maintenance | Aktif | Toggle darurat |
| Release Notes | Aktif | Editor rilis |
| Deployment History | Aktif | Sudah tampil di Dashboard juga — **konsolidasi** |
| System Audit | Aktif | Tools admin recovery |
| Play Store | **Pasif** | Checklist statis, jarang dibuka setelah rilis Android |
| Force Refresh | Aktif tapi berbahaya | Sudah tumpang tindih dengan Cache |
| Notification Audit | **Pasif** | Read-only stats — cocok jadi widget, bukan tab |
| PWA Audit | **Pasif** | Cek client-side, sekali lihat |
| User Sessions | Aktif | Live monitoring |
| Cache | Aktif | Tumpang tindih dg Force Refresh |
| Update Center Preview | **Pasif** | Preview halaman publik — tidak perlu tab tersendiri |

## Rekomendasi: 5 Tab Konsolidasi

```text
┌─────────────────────────────────────────────────────────────┐
│ 📊 Overview │ 🚀 Deployment │ 🛠 Operations │ 👥 Clients │ 🔍 Audit │
└─────────────────────────────────────────────────────────────┘
```

### 1. 📊 Overview (default)
- `SystemManagementCenter` dashboard KPI (versi, health, adopsi, aktivitas)
- **Ganti** kartu "Update Center Preview" jadi link kecil ke `/update-center` (buka tab baru)
- **Serap** ringkasan Deployment History (5 terakhir) sebagai widget

### 2. 🚀 Deployment
Sub-tab dalam satu panel:
- **Versi Aplikasi** (AppVersionManager) — primary action
- **Release Notes** (ReleaseNotesManager)
- **History** (DeploymentHistoryPanel) — daftar draft/published/archived

### 3. 🛠 Operations
Kontrol runtime, digabung karena tumpang tindih:
- **Maintenance Mode** (toggle)
- **Cache & Force Refresh** — merge `CacheManagementPanel` + `ForceRefreshCenter` jadi satu panel "Cache & Refresh Control" (broadcast clear cache / hard reload / force update — tombol sama, satu tempat)

### 4. 👥 Clients
- **User Sessions** (list device online + versi client)
- **Notification Audit** dipindah sini sebagai kartu ringkas (jumlah token, delivery rate) — tidak lagi jadi tab pasif

### 5. 🔍 Audit & Readiness
- **System Audit** (recovery tools)
- **Play Store Checklist** (collapsible accordion, karena statis)
- **PWA Audit** (collapsible accordion)

## Perubahan File

- **`src/components/admin/system/SystemManagementHub.tsx`**
  - Ganti 13 `TabsTrigger` → 5 tab utama
  - Tambah sub-`Tabs` internal untuk Deployment & Audit (accordion untuk Play Store & PWA)
  - Query param `?tab=` tetap dipertahankan (`overview|deployment|operations|clients|audit`)
  - Redirect legacy: `?tab=version|release-notes|history` → `deployment`, `?tab=maintenance|cache|force` → `operations`, `?tab=sessions|notif` → `clients`, `?tab=playstore|pwa|audit` → `audit`, `?tab=update-center|dashboard` → `overview`

- **`src/components/admin/system/CacheAndRefreshPanel.tsx`** *(baru — menggantikan)*
  - Menggabungkan `CacheManagementPanel` + `ForceRefreshCenter`
  - Section 1: **Cache Actions** (Clear cache / Rebuild / Sync version)
  - Section 2: **Force Refresh Broadcast** (existing UI dari ForceRefreshCenter, tapi ringkas — buang duplikasi tombol)

- **`src/components/admin/system/ClientsPanel.tsx`** *(baru — wrapper)*
  - Import `UserSessionsPanel` + kartu ringkas Notification Audit (top 4 KPI dari `NotificationAuditPanel`, tombol "Kirim Test" tetap)

- **`src/components/admin/system/AuditPanel.tsx`** *(baru — wrapper)*
  - `SystemAuditPanel` di atas
  - Accordion collapsible: "Play Store Readiness" & "PWA Audit"

- **Dihapus** (tidak dipakai lagi):
  - `src/components/admin/system/UpdateCenterPreview.tsx` (diganti link)

- **`src/components/admin/system-center/SystemManagementCenter.tsx`**
  - Tambah widget kecil "5 Deployment Terakhir" (data sudah ada di `useSystemCenter`)
  - Tambah tombol link ke `/update-center`

## Yang TIDAK Diubah
- Database, RLS, tabel `app_releases`, `app_version_clients`
- Business logic force-update / version enforcement
- Route `/dashboard/system-management` tetap
- Semua komponen panel existing tetap ada (hanya di-*wrap*), sehingga bisa di-rollback cepat

## Hasil Akhir
- Header tab dari 13 → 5 (muat 1 baris di desktop, no wrap)
- Panel pasif (Play Store, PWA, Update Center Preview, Notification Audit) tetap bisa diakses tapi tidak memakan slot tab utama
- Flow jelas: **Overview → Deployment → Operations → Clients → Audit**
