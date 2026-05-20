import { supabase } from "@/integrations/supabase/client";

export interface BranchGeo {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

/** Haversine distance in km between two lat/lng pairs. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.round(R * c * 10) / 10;
}

let branchGeoCache: BranchGeo[] | null = null;

export async function fetchBranchesWithGeo(): Promise<BranchGeo[]> {
  if (branchGeoCache) return branchGeoCache;
  const { data } = await supabase
    .from("branches")
    .select("id,slug,name,lat,lng,address")
    .eq("is_active", true)
    .not("lat", "is", null)
    .not("lng", "is", null);
  branchGeoCache = ((data || []) as any[]).filter(
    (b) => typeof b.lat === "number" && typeof b.lng === "number",
  ) as BranchGeo[];
  return branchGeoCache;
}

export function findNearestBranch(
  point: { lat: number; lng: number },
  branches: BranchGeo[],
): { branch: BranchGeo; distanceKm: number } | null {
  if (!branches.length) return null;
  let best: { branch: BranchGeo; distanceKm: number } | null = null;
  for (const b of branches) {
    const d = haversineKm(point, { lat: b.lat, lng: b.lng });
    if (!best || d < best.distanceKm) best = { branch: b, distanceKm: d };
  }
  return best;
}

/**
 * Parse a Google/Apple Maps URL and extract lat/lng if possible.
 * Returns null for short links (goo.gl/maps/...) — those need server-side resolution.
 */
export function parseMapsLink(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const url = input.trim();

  // 1) @lat,lng,zoom
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  // 2) ?q=lat,lng or &q=lat,lng or ?query=lat,lng
  const q = url.match(/[?&](?:q|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };

  // 3) !3dLAT!4dLNG (encoded place coords)
  const place = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: parseFloat(place[1]), lng: parseFloat(place[2]) };

  // 4) bare "lat,lng" pasted by user
  const bare = url.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (bare) return { lat: parseFloat(bare[1]), lng: parseFloat(bare[2]) };

  // 5) /maps/search/LAT,LNG  or  /maps/place/LAT,LNG  or  /maps/dir/LAT,LNG
  const pathCoords = url.match(/\/maps\/(?:search|place|dir)\/(-?\d+\.\d+),\+?\s*(-?\d+\.\d+)/);
  if (pathCoords) return { lat: parseFloat(pathCoords[1]), lng: parseFloat(pathCoords[2]) };

  return null;
}

/** Reverse geocode via OpenStreetMap Nominatim (free, no key). */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`,
      { headers: { "Accept": "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.display_name as string) || null;
  } catch {
    return null;
  }
}

/** Static map image URL via OSM (no key). */
export function staticMapUrl(
  point: { lat: number; lng: number },
  width = 480,
  height = 180,
  zoom = 15,
): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${point.lat},${point.lng}&zoom=${zoom}&size=${width}x${height}&markers=${point.lat},${point.lng},red-pushpin`;
}

export interface BrowserGeoResult {
  lat: number;
  lng: number;
  accuracy: number;
}

export function getBrowserLocation(): Promise<BrowserGeoResult> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Browser tidak mendukung lokasi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}