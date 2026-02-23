export type TripRole = 'owner' | 'participant' | 'viewer';

export interface TripRow {
  id: string; user_id: string; name: string; start_date: string; end_date: string;
  destination: string | null; created_at: string; updated_at: string; tags?: string; budget?: number;
}

export type TripResponse = {
  id: string; userId: string; name: string; startDate: string; endDate: string;
  destination?: string; createdAt: string; updatedAt: string;
  tags?: string[]; budget?: number; role?: TripRole;
};

export interface ActivityRow {
  id: string; trip_id: string; day_index: number; title: string; time: string | null;
  description: string | null; address: string | null; lat: number | null; lng: number | null; order: number;
}

export interface AccRow {
  id: string; trip_id: string; name: string; address: string; check_in_date: string;
  check_out_date: string; notes: string | null; booking_url: string | null; lat: number | null; lng: number | null;
}

export interface AttrRow {
  id: string; trip_id: string; name: string; address: string; opening_hours: string | null;
  price: string | null; url: string | null; notes: string | null; lat: number | null;
  lng: number | null; day_indexes: string;
}

export interface ShopRow {
  id: string; trip_id: string; text: string; done: number; order: number; category: string | null;
}

export interface DocRow {
  id: string; trip_id: string; user_id: string; title: string; type: string | null;
  file_url: string; mime_type: string | null; created_at: string; updated_at: string;
}

export interface ExpenseRow {
  id: string; trip_id: string; description: string; amount: number; created_at: string;
}

export interface PinnedPlaceRow {
  id: string; trip_id: string; name: string; address: string | null; lat: number | null;
  lng: number | null; created_at: string;
}

export interface FlightRow {
  id: string; trip_id: string; flight_number: string | null; airline: string | null;
  airport_departure: string | null; airport_arrival: string | null; departure_datetime: string | null;
  arrival_datetime: string | null; gate: string | null; ticket_url: string | null;
  ticket_notes: string | null; seat: string | null; cabin_class: string | null;
  duration_minutes: number | null; notes: string | null;
}

// --- Converters (DB row -> API response) ---

export function toTrip(r: TripRow, role?: TripRole): TripResponse {
  let tags: string[] | undefined;
  if (r.tags != null && r.tags !== '') {
    try { tags = JSON.parse(r.tags); } catch { tags = []; }
  }
  const out: TripResponse = {
    id: r.id, userId: r.user_id, name: r.name, startDate: r.start_date, endDate: r.end_date,
    destination: r.destination ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at,
    tags: tags ?? undefined, budget: r.budget ?? undefined,
  };
  if (role !== undefined) out.role = role;
  return out;
}

export function toActivity(r: ActivityRow) {
  return {
    id: r.id, tripId: r.trip_id, dayIndex: r.day_index, title: r.title,
    time: r.time ?? undefined, description: r.description ?? undefined,
    address: r.address ?? undefined, lat: r.lat ?? undefined, lng: r.lng ?? undefined, order: r.order,
  };
}

export function toAccommodation(r: AccRow) {
  return {
    id: r.id, tripId: r.trip_id, name: r.name, address: r.address,
    checkInDate: r.check_in_date, checkOutDate: r.check_out_date,
    notes: r.notes ?? undefined, bookingUrl: r.booking_url ?? undefined,
    lat: r.lat ?? undefined, lng: r.lng ?? undefined,
  };
}

export function toAttraction(r: AttrRow) {
  let dayIndexes: number[] = [];
  try { dayIndexes = JSON.parse(r.day_indexes); } catch { /* empty */ }
  return {
    id: r.id, tripId: r.trip_id, name: r.name, address: r.address,
    openingHours: r.opening_hours ?? undefined, price: r.price ?? undefined,
    url: r.url ?? undefined, notes: r.notes ?? undefined,
    lat: r.lat ?? undefined, lng: r.lng ?? undefined, dayIndexes,
  };
}

export function toShoppingItem(r: ShopRow) {
  return {
    id: r.id, tripId: r.trip_id, text: r.text, done: r.done === 1,
    order: r.order, category: (r.category as 'ציוד' | 'מסמכים' | 'כללי') ?? undefined,
  };
}

export function toDocument(r: DocRow) {
  return {
    id: r.id, tripId: r.trip_id, title: r.title,
    type: (r.type as 'passport' | 'visa' | 'insurance' | 'booking' | 'other') ?? undefined,
    fileUrl: r.file_url,
  };
}

export function toExpense(e: ExpenseRow) {
  return { id: e.id, tripId: e.trip_id, description: e.description, amount: e.amount, createdAt: e.created_at };
}

export function toPinnedPlace(p: PinnedPlaceRow) {
  return {
    id: p.id, tripId: p.trip_id, name: p.name, address: p.address ?? undefined,
    lat: p.lat ?? undefined, lng: p.lng ?? undefined, createdAt: p.created_at,
  };
}

export function toFlight(r: FlightRow) {
  return {
    id: r.id, tripId: r.trip_id, flightNumber: r.flight_number ?? undefined,
    airline: r.airline ?? undefined, airportDeparture: r.airport_departure ?? undefined,
    airportArrival: r.airport_arrival ?? undefined, departureDateTime: r.departure_datetime ?? undefined,
    arrivalDateTime: r.arrival_datetime ?? undefined, gate: r.gate ?? undefined,
    ticketUrl: r.ticket_url ?? undefined, ticketNotes: r.ticket_notes ?? undefined,
    seat: r.seat ?? undefined, cabinClass: r.cabin_class ?? undefined,
    durationMinutes: r.duration_minutes ?? undefined, notes: r.notes ?? undefined,
  };
}
