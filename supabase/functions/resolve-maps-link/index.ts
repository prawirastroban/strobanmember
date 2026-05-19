import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const ALLOWED_HOSTS = [
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'maps.google.com',
  'www.google.com',
  'google.com',
];

function parseCoords(url: string): { lat: number; lng: number } | null {
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const place = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: parseFloat(place[1]), lng: parseFloat(place[2]) };
  const q = url.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}

const LATLNG_RE = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;

function extractAddressFromUrl(finalUrl: string): string | null {
  try {
    const u = new URL(finalUrl);
    for (const key of ["q", "query", "destination"]) {
      const v = u.searchParams.get(key);
      if (v && !LATLNG_RE.test(v.trim())) {
        return v.replace(/\+/g, " ").trim();
      }
    }
  } catch { /* ignore */ }
  return null;
}

function extractAddressFromBody(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return null;
  let t = m[1].trim();
  t = t.replace(/\s*[-–|]\s*Google Maps\s*$/i, "").trim();
  if (!t || /^google maps$/i.test(t)) return null;
  return t;
}

async function forwardGeocode(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const tryOnce = async (q: string) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=id&q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent":
              "BengkelStrobanResolver/1.0 (support@bengkelstroban.com)",
            "Accept": "application/json",
          },
        },
      );
      if (!r.ok) return null;
      const arr = await r.json();
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const lat = parseFloat(arr[0].lat);
      const lon = parseFloat(arr[0].lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
      return { lat, lng: lon };
    } catch {
      return null;
    }
  };

  // 1) full query
  let hit = await tryOnce(query);
  if (hit) return hit;

  // 2) cleaned: strip postal codes, "Kab./Kota/Kec./Kel." prefixes, RT/RW
  const cleaned = query
    .replace(/\b\d{5}\b/g, "")
    .replace(/\b(Kab\.?|Kabupaten|Kota|Kec\.?|Kecamatan|Kel\.?|Kelurahan|Desa)\s+/gi, "")
    .replace(/\bRT\s*\.?\s*\d+\s*\/?\s*RW?\s*\.?\s*\d*/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*,+/g, ",")
    .trim();
  if (cleaned && cleaned !== query) {
    hit = await tryOnce(cleaned);
    if (hit) return hit;
  }

  // 3) last 2-3 comma-segments only (street + city)
  const parts = query.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const shortQ = parts.slice(0, 2).join(", ");
    if (shortQ !== query && shortQ !== cleaned) {
      hit = await tryOnce(shortQ);
      if (hit) return hit;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'url required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'invalid url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      return new Response(JSON.stringify({ success: false, error: 'host not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Follow redirects
    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      },
    });
    const finalUrl = res.url || parsed.toString();
    let coords = parseCoords(finalUrl);
    let resolvedAddress: string | null = null;
    let source: "url" | "body" | "geocoded" = "url";

    let body = "";
    // Fallback 1: scan body for coords (some short links land on a JS page)
    if (!coords) {
      try {
        body = await res.text();
        coords =
          parseCoords(body) ||
          (() => {
            const m = body.match(/"(-?\d+\.\d{4,}),(-?\d+\.\d{4,})"/);
            return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
          })();
        if (coords) source = "body";
      } catch {
        /* ignore */
      }
    }

    // Fallback 2: forward-geocode address from URL `q=` or page <title>
    if (!coords) {
      const addr =
        extractAddressFromUrl(finalUrl) ||
        (body ? extractAddressFromBody(body) : null);
      if (addr) {
        resolvedAddress = addr;
        const geo = await forwardGeocode(addr);
        if (geo) {
          coords = geo;
          source = "geocoded";
        }
      }
    }

    if (!coords) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'coords not found',
          resolved_url: finalUrl,
          resolved_address: resolvedAddress,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        lat: coords.lat,
        lng: coords.lng,
        resolved_url: finalUrl,
        resolved_address: resolvedAddress,
        source,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});