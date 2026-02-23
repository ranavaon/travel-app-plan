/**
 * Google Maps URLs for search and navigation (opens in browser / Maps app).
 */

/** Search for a place by address or query. */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/**
 * Open navigation from current location to destination.
 * Use in external app (e.g. Google Maps / Waze) to start navigation.
 */
export function mapsNavigationUrl(options: {
  address?: string;
  lat?: number;
  lng?: number;
}): string {
  const { address, lat, lng } = options;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
  const destination = hasCoords ? `${lat},${lng}` : (address?.trim() ? encodeURIComponent(address.trim()) : '');
  if (!destination) return mapsSearchUrl(address ?? '');
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
