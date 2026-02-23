import type { Trip, Activity, Accommodation, Attraction, ShoppingItem, PinnedPlace, Flight } from '../types';

export function exportFileNameFromTripName(name: string): string {
  return `${name.replace(/[^\w\s\u0590-\u05FF-]/g, '') || 'trip'}`.trim() || 'trip';
}

export function getShareBaseOrigin(hostname: string, host: string, origin: string): string {
  return hostname === 'localhost' || hostname === '127.0.0.1' ? `http://${host}` : origin;
}

export function pinnedPlaceMapsUrl(p: PinnedPlace): string | null {
  if (p.lat != null && p.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  if (p.address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address.trim())}`;
  }
  return null;
}

export function buildTripAsText(
  trip: Trip,
  days: { date: string; dayIndex: number }[],
  activities: Activity[],
  accommodations: Accommodation[],
  attractions: Attraction[],
  shoppingItems: ShoppingItem[],
  flights: Flight[] = [],
): string {
  const lines: string[] = [trip.name, '='.repeat(trip.name.length), ''];
  if (trip.destination) lines.push(`יעד: ${trip.destination}`, '');
  lines.push(`תאריכים: ${trip.startDate} – ${trip.endDate}`, '');

  for (const day of days) {
    const dayActivities = activities.filter((a) => a.dayIndex === day.dayIndex).sort((a, b) => a.order - b.order);
    lines.push(`יום ${day.dayIndex + 1} – ${day.date}`, '-'.repeat(20));
    for (const a of dayActivities) {
      lines.push(`  ${a.time ?? ''} ${a.title}`.trim());
      if (a.description) lines.push(`    ${a.description}`);
      if (a.address) lines.push(`    ${a.address}`);
    }
    lines.push('');
  }

  if (flights.length > 0) {
    lines.push('טיסות', '-'.repeat(20));
    for (const f of flights) {
      const parts = [f.airline, f.flightNumber].filter(Boolean).join(' ');
      if (parts) lines.push(`  ${parts}`);
      if (f.airportDeparture || f.airportArrival) lines.push(`    ${f.airportDeparture ?? ''} → ${f.airportArrival ?? ''}`);
      if (f.departureDateTime) lines.push(`    יציאה: ${f.departureDateTime}`);
      if (f.arrivalDateTime) lines.push(`    נחיתה: ${f.arrivalDateTime}`);
    }
    lines.push('');
  }

  if (accommodations.length > 0) {
    lines.push('לינה', '-'.repeat(20));
    for (const a of accommodations) {
      lines.push(`  ${a.name} | ${a.checkInDate} – ${a.checkOutDate}`);
      if (a.address) lines.push(`    ${a.address}`);
    }
    lines.push('');
  }

  if (attractions.length > 0) {
    lines.push('אטרקציות', '-'.repeat(20));
    for (const a of attractions) {
      lines.push(`  ${a.name}${a.address ? ` | ${a.address}` : ''}`);
    }
    lines.push('');
  }

  if (shoppingItems.length > 0) {
    lines.push('רשימת קניות', '-'.repeat(20));
    for (const s of shoppingItems) {
      lines.push(`  ${s.done ? '[x]' : '[ ]'} ${s.text}`);
    }
  }

  return lines.join('\n');
}
