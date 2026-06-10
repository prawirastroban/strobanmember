
# Audit & Rencana: Web Analytics Dashboard

Mode analisis — belum ada perubahan kode. Tujuan: tambahkan panel **Web Analytics** untuk Owner/Management tanpa membebani sistem operasional.

---

## 1. Audit Data yang Sudah Tersedia

| Kategori | Sumber di DB | Status |
|---|---|---|
| Booking, revenue, conversion source booking | `bookings` (67 kolom) | ✅ lengkap |
| Customer baru | `profiles.created_at`, `auth.users` | ✅ |
| Vehicle, payment, invoice | `vehicles`, `payments`, `invoices` | ✅ |
| Activity log internal | `activity_logs` (type, metadata jsonb) | ✅ tapi hanya event internal staff & review |
| Top services (dari booking) | `bookings.service_id` join `services` | ✅ |
| PWA install funnel | `pwa_events` (shown/accepted/dismissed) | ✅ terbatas 3 event |
| Loyalty, referral, complaints, internal reports | berbagai tabel | ✅ |
| Push token & device platform pengguna login | `push_tokens.platform` | ✅ parsial (hanya user terdaftar) |

**Yang ada di Dashboard saat ini** (`AdminDashboard`, `DashboardHomeBlocks`, `CRMAnalytics`, `FinanceDashboard`): KPI booking, revenue 7 hari (Area Chart), Need Attention, Top services, Quick Access. **Belum ada satupun metrik traffic/visitor.**

## 2. Data yang BELUM Tersedia (gap)

Semua metrik visitor adalah data **client-side / pre-login** yang tidak pernah dicatat:

1. **Page view & session** (Total Visitor, Unique Visitor harian/7d/30d)
2. **Traffic source** (Google, Direct, WA, IG, FB, Referral) — butuh `document.referrer` + UTM
3. **Device breakdown** (mobile/desktop/tablet) — butuh user-agent parser
4. **Top pages** (Home, Booking, Katalog, Reminder, dst)
5. **Top searched services** — pencarian di Katalog belum dilog
6. **Top cities** — IP geolocation, belum ada
7. **Booking funnel step**: View Service → Start Booking → Submit → Success. Saat ini hanya tahu hasil akhir (booking submit), tidak tahu drop-off.
8. **Conversion rate** Visitor → Booking — butuh denominator (visitor)
9. **Bounce / time-on-page / scroll depth**

## 3. Pilihan Arsitektur (rekomendasi bertahap)

### Opsi A — **Integrasi pihak ketiga** (cepat, nol beban DB) ⭐ rekomendasi fase 1
- **Google Analytics 4** → visitor, source, device, top pages, geo, conversion event.
- **Google Search Console** (via connector yang sudah tersedia di Lovable) → impression, klik organik, query.
- **Microsoft Clarity** → heatmap, session replay, rage click (gratis, ringan).

**Dampak performa:** ~30–60 KB JS async, tidak menyentuh DB Supabase, tidak menambah load Postgres. Aman.

**Dampak privasi:** perlu update Kebijakan Privasi + cookie consent banner (sudah ada `legal_documents`).

### Opsi B — **First-party event tracker** (lebih dalam, butuh DB)
Tambah tabel ringan `analytics_events` (event, path, session_id anon, referrer, utm, device, country, created_at). Hanya untuk funnel internal (View Service, Start Booking, Submit, Success) — bukan untuk semua page view.

**Dampak DB:** ~5–10 baris per session aktif. Pakai partisi bulanan + retention 90 hari + index `(event, created_at)`. Beban kecil bila dibatasi pada event funnel saja.

**Rekomendasi:** Kombinasi A (semua metrik traffic) + B *terbatas* untuk funnel booking dan top searched services.

### Opsi C — Hanya internal (tanpa GA)
Bangun semua sendiri di Supabase. Tidak direkomendasikan: beban tulis tinggi, geo-IP perlu edge function, dan kalah lengkap dari GA4.

## 4. Arsitektur yang Diusulkan (Fase 1 → 3)

```text
                    ┌────────────────────────┐
 Browser / PWA ───► │ GA4 (gtag async)       │──► dashboard via
                    │ Clarity (async)        │    GA4 Data API
                    │ Search Console verified│
                    └────────────────────────┘
       │
       └─► event funnel kritikal ──► Supabase Edge Function
                                     `track-event`
                                     └─► public.analytics_events
                                         (RLS: insert anon, read staff)
```

Owner dashboard memanggil:
- **GA4 Data API** via Edge Function `ga4-metrics` (service-account key disimpan di secret) → cached 5 menit di KV in-memory.
- **Search Console** via connector gateway yang sudah tersedia.
- **Internal funnel** query langsung ke `analytics_events` + `bookings`.

## 5. Dampak Performa & Database

| Item | Beban |
|---|---|
| GA4/Clarity script | async, ±50 KB, tidak blok render |
| Edge Function `ga4-metrics` | dipanggil saat buka tab Analytics, cache 5 menit |
| Tabel `analytics_events` (Opsi B) | ~1 insert/event funnel; index ringan; retention 90 hari (cron) |
| Existing operasional (booking/payment) | **0 perubahan**, tidak disentuh |

Tidak ada query baru pada path kritikal customer (checkout, booking submit) selain 1 fire-and-forget insert per event funnel.

## 6. UI yang Diusulkan

Route baru: `/dashboard/analytics` (Owner + Staff). Konsisten dengan style liquid-glass + accent `#ff2b2b`.

```text
┌─ Web Analytics ─────────────────────────────────────┐
│ [ Hari Ini ] [ 7 Hari ] [ 30 Hari ]   ▼ Cabang     │
├─────────────────────────────────────────────────────┤
│ KPI Strip (4 kartu): Visitor · Unique · New User ·  │
│                       Conversion Rate %             │
├──────────────────────────┬──────────────────────────┤
│ Booking Funnel (bar)     │ Traffic Sources (donut)  │
│ Visitor→View→Start→Done  │ Google/Direct/WA/IG/FB   │
├──────────────────────────┼──────────────────────────┤
│ Device (mobile/desk/tab) │ Top Cities               │
├──────────────────────────┴──────────────────────────┤
│ Top Pages  │  Top Searched  │  Top Booked Services  │
├─────────────────────────────────────────────────────┤
│ 💡 Insight & Recommendation (AI)                    │
│  • Traffic +12% minggu ini                          │
│  • Mobile 89% — pastikan UI mobile prima            │
│  • Pencarian "spooring" +25% — buat promo           │
│  • Conversion -4% — periksa step Start→Submit       │
└─────────────────────────────────────────────────────┘
```

Owner Executive View (di top dashboard utama): strip 6 indikator panah ↑/↓ — Traffic, Booking, Conversion, Layanan Top, Kota Top, Pertumbuhan.

AI Insight digenerate via Lovable AI Gateway (Gemini) dari ringkasan angka, cache 1 jam.

## 7. Rencana Implementasi Bertahap

**Fase 1 — Foundation (low risk, cepat)**
1. Pasang GA4 (`VITE_GA4_ID`), Clarity (`VITE_CLARITY_ID`), Search Console verification (connector sudah ada).
2. Update cookie consent + Kebijakan Privasi.
3. Buat halaman `/dashboard/analytics` skeleton + KPI Strip dummy.

**Fase 2 — Data integration**
4. Edge function `ga4-metrics` (service-account JSON di secret) + `gsc-metrics` (via connector).
5. KPI, Traffic Source, Device, Top Pages, Top Cities terisi data nyata.
6. Top Booked Services dari `bookings` (sudah ada).

**Fase 3 — Funnel & search internal**
7. Tabel `analytics_events` + edge function `track-event`.
8. Instrument 4 titik: view service, start booking, submit, success.
9. Instrument input pencarian di Katalog → event `search_service`.
10. Funnel chart + Top Searched Services + Conversion Rate akurat.

**Fase 4 — AI Insight**
11. Edge function `analytics-insight` (Gemini) → ringkasan + rekomendasi, cache 1 jam.
12. Owner Executive Strip di `/dashboard`.

## 8. Yang Saya Butuhkan dari Anda Sebelum Implementasi

1. **Persetujuan arsitektur** Opsi A + B (kombinasi).
2. **Akun & ID**: GA4 Measurement ID + service-account JSON, Clarity Project ID, Google Search Console (connector — bisa link via Lovable).
3. Konfirmasi **retention 90 hari** untuk `analytics_events` cukup.
4. Konfirmasi **cookie consent banner** boleh kami tambahkan (wajib untuk GA4 di EU; di ID opsional tapi praktik baik).

Setelah disetujui, saya kerjakan Fase 1 dulu lalu lapor sebelum lanjut Fase 2.
