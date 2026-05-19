## Masalah

Saat user paste link pendek Google Maps (`https://maps.app.goo.gl/...`), parser `parseMapsLink` di `src/lib/geoUtils.ts` mengembalikan `null` karena link pendek tidak punya koordinat di URL-nya — koordinat baru muncul setelah Google meredirect ke URL panjang. Akibatnya muncul toast "Link tidak dikenali...".

Fetch redirect dari browser ditolak CORS, jadi resolve harus dilakukan di server (Edge Function).

## Perbaikan

### 1. Edge function baru: `supabase/functions/resolve-maps-link/index.ts`

- Input: `{ url: string }` (POST JSON).
- Validasi: hanya host `maps.app.goo.gl`, `goo.gl`, `g.co`, `maps.google.com`, `www.google.com/maps`.
- Lakukan `fetch(url, { redirect: "follow" })` lalu baca `response.url` (URL akhir). Sebagai fallback, baca body untuk meta-refresh / `data-url`.
- Parse URL akhir dengan regex yang sama seperti `parseMapsLink`:
  - `@lat,lng,zoom`
  - `!3dLAT!4dLNG`
  - `?q=lat,lng` / `?ll=lat,lng` / `?destination=lat,lng`
- Return `{ success: true, lat, lng, resolved_url }` atau `{ success: false, error }`.
- Config: `verify_jwt = false` di `supabase/config.toml` (publik aman, hanya resolver URL).
- CORS headers lengkap.

### 2. `src/lib/geoUtils.ts` — tambah helper `resolveShortMapsLink`

```ts
export async function resolveShortMapsLink(url: string): Promise<{lat:number;lng:number} | null> {
  const { data, error } = await supabase.functions.invoke("resolve-maps-link", { body: { url } });
  if (error || !data?.success) return null;
  return { lat: data.lat, lng: data.lng };
}
```

(Tambah import supabase client di geoUtils — atau buat fungsi di file terpisah agar geoUtils tetap pure. Akan diletakkan di file baru `src/lib/resolveMapsLink.ts` agar `geoUtils.ts` tetap tanpa dependensi supabase.)

### 3. `src/components/booking/PickupLocationSection.tsx` — fallback resolve

Pada `handlePasteLink`:
```ts
const parsed = parseMapsLink(linkInput);
if (parsed) { await applyCoords(...); return; }

// Coba resolve link pendek
if (/maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs/i.test(linkInput)) {
  setResolving(true);
  const r = await resolveShortMapsLink(linkInput.trim());
  setResolving(false);
  if (r) { await applyCoords(r.lat, r.lng, "maps_link"); setLinkInput(""); return; }
  toast.error("Tidak bisa membaca koordinat dari link pendek. Buka link di browser dulu lalu copy URL panjangnya, atau tempel format -6.95,107.61");
  return;
}

toast.error("Link tidak dikenali...");
```

Tambahkan state `resolving` + spinner kecil pada tombol "Pakai".

## Yang TIDAK diubah

- Logika nearest branch / overLimit / reverse geocode.
- UI lain di section pickup.

## Catatan

- Resolver hanya mengikuti redirect → tidak butuh API key Google.
- Jika Google mengubah pola URL panjang, regex sudah meng-cover 3 format umum.
