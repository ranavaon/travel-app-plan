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
