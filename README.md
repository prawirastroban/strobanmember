# Bengkel Stroban — Sahabat Stroban Service

Aplikasi web & PWA resmi Bengkel Stroban untuk booking servis mobil, katalog ban, program loyalitas, dan tracker progres servis secara realtime.

- Website: https://www.bengkelstroban.com
- Support WhatsApp: +62 897-3700-800

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui (tema "liquid glass")
- Supabase (Database, Auth, Edge Functions, Realtime, Storage)
- Capacitor (PWA & native Android/iOS)
- Resend (email transaksional) & Twilio (WhatsApp)

## Menjalankan secara lokal

Prasyarat: Node.js 18+ dan `bun` (atau `npm`).

```bash
bun install
bun run dev
```

Aplikasi akan berjalan di `http://localhost:5173`.

## Build produksi

```bash
bun run build
```

Output build berada di folder `dist/` dan siap di-deploy ke hosting statis apa pun.

## Struktur singkat

- `src/pages` — halaman publik & dashboard
- `src/components` — komponen UI (termasuk admin)
- `src/integrations/supabase` — client Supabase (auto-generated, jangan diedit manual)
- `supabase/functions` — edge functions (chat assistant, push notification, invoice, dll)
- `supabase/migrations` — riwayat skema database

## Lisensi

Hak cipta © Sahabat Stroban Service. Seluruh hak dilindungi.
