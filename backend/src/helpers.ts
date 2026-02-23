import { db } from './db.js';
import type { TripRole, TripRow } from './models.js';

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function randomToken(): string {
  return genId() + genId();
}

export function getTripRole(tripId: string, userId: string): TripRole | null {
  const trip = db.prepare('SELECT user_id FROM trips WHERE id = ?').get(tripId) as { user_id: string } | undefined;
  if (!trip) return null;
  if (trip.user_id === userId) return 'owner';
  const row = db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').get(tripId, userId) as { role: string } | undefined;
  if (!row) return null;
  return row.role as 'participant' | 'viewer';
}

export function getTripIdsForUser(userId: string): string[] {
  const owned = db.prepare('SELECT id FROM trips WHERE user_id = ?').all(userId) as { id: string }[];
  const member = db.prepare('SELECT trip_id FROM trip_members WHERE user_id = ?').all(userId) as { trip_id: string }[];
  const ids = new Set(owned.map((r) => r.id));
  member.forEach((r) => ids.add(r.trip_id));
  return [...ids];
}

export function canEditTrip(tripId: string, userId: string): boolean {
  const role = getTripRole(tripId, userId);
  return role === 'owner' || role === 'participant';
}

export function canManageMembers(tripId: string, userId: string): boolean {
  return getTripRole(tripId, userId) === 'owner';
}

export function computeDaysFromTrip(trip: TripRow): { date: string; dayIndex: number }[] {
  const start = new Date(trip.start_date + 'T12:00:00');
  const end = new Date(trip.end_date + 'T12:00:00');
  const days: { date: string; dayIndex: number }[] = [];
  let dayIndex = 0;
  const endTime = end.getTime();
  for (let d = new Date(start); d.getTime() <= endTime; d.setDate(d.getDate() + 1), dayIndex++) {
    days.push({ date: d.toISOString().slice(0, 10), dayIndex });
  }
  return days;
}
