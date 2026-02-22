/**
 * Geocoding via OpenStreetMap Nominatim (no API key).
 * Use sparingly; cache is in-memory per session.
 */

const CACHE = new Map<string, { lat: number; lng: number }>();

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.trim();
  if (!key) return null;
  const cached = CACHE.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(key)}&limit=1`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    const result = { lat, lng };
    CACHE.set(key, result);
    return result;
  } catch {
    return null;
  }
}

const REVERSE_CACHE = new Map<string, string>();

/** Reverse geocode: get display address from lat/lng (Nominatim). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = REVERSE_CACHE.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    const addr = data?.address;
    if (!addr || typeof addr !== 'object') return null;
    const parts = [
      addr.road,
      addr.house_number,
      addr.suburb ?? addr.neighbourhood ?? addr.quarter,
      addr.city ?? addr.town ?? addr.village ?? addr.municipality,
      addr.country,
    ].filter(Boolean);
    const result = parts.length ? parts.join(', ') : (data?.display_name ?? null);
    if (result) REVERSE_CACHE.set(key, result);
    return result ?? null;
  } catch {
    return null;
  }
}
