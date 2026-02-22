/**
 * Safe export file name from trip name (strips invalid chars, supports Hebrew).
 */
export function exportFileNameFromTripName(name: string): string {
  return `${name.replace(/[^\w\s\u0590-\u05FF-]/g, '') || 'trip'}`.trim() || 'trip';
}

/**
 * Base origin for share URL: use http for localhost/127.0.0.1 so the link works in dev.
 */
export function getShareBaseOrigin(hostname: string, host: string, origin: string): string {
  return hostname === 'localhost' || hostname === '127.0.0.1' ? `http://${host}` : origin;
}
