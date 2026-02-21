import type { Trip, Day } from '../types';

const tripsStore: Trip[] = [
  { id: '1', userId: 'u1', name: 'Trip 1', startDate: '2025-03-01', endDate: '2025-03-05', destination: 'Tel Aviv', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: '2', userId: 'u1', name: 'Trip 2', startDate: '2025-04-10', endDate: '2025-04-15', destination: 'Eilat', createdAt: '2025-01-02T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' },
];

function nextId(): string {
  const max = tripsStore.reduce((m, t) => Math.max(m, parseInt(t.id, 10) || 0), 0);
  return String(max + 1);
}

export function getTrips(): Trip[] {
  return [...tripsStore];
}

export function getTrip(id: string): Trip | undefined {
  return tripsStore.find((t) => t.id === id);
}

export function getDays(trip: Trip): Day[] {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const days: Day[] = [];
  let dayIndex = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1), dayIndex++) {
    days.push({ tripId: trip.id, date: d.toISOString().slice(0, 10), dayIndex });
  }
  return days;
}

export function addTrip(data: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Trip {
  const now = new Date().toISOString();
  const trip: Trip = {
    id: nextId(),
    userId: 'u1',
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    destination: data.destination,
    createdAt: now,
    updatedAt: now,
  };
  tripsStore.push(trip);
  return trip;
}

export function updateTrip(id: string, data: Partial<Pick<Trip, 'name' | 'startDate' | 'endDate' | 'destination'>>): Trip | undefined {
  const trip = tripsStore.find((t) => t.id === id);
  if (!trip) return undefined;
  if (data.name !== undefined) trip.name = data.name;
  if (data.startDate !== undefined) trip.startDate = data.startDate;
  if (data.endDate !== undefined) trip.endDate = data.endDate;
  if (data.destination !== undefined) trip.destination = data.destination;
  trip.updatedAt = new Date().toISOString();
  return trip;
}

export function deleteTrip(id: string): boolean {
  const i = tripsStore.findIndex((t) => t.id === id);
  if (i === -1) return false;
  tripsStore.splice(i, 1);
  return true;
}
