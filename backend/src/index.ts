import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { getRequestUserId, getRequestUserIdOrNull, signToken, getUserByEmail, getUserById, toAuthUser } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Auth ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const existing = getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const id = genId();
  const password_hash = bcrypt.hashSync(password, 10);
  const created_at = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email, password_hash, name ?? null, created_at);
  const user = toAuthUser(getUserById(id)!);
  const token = signToken(id);
  res.status(201).json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const row = getUserByEmail(email);
  if (!row) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!row.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const user = toAuthUser(row);
  const token = signToken(row.id);
  res.json({ user, token });
});

// --- Current user profile (requires auth) ---
app.patch('/api/users/me', (req, res) => {
  const userId = getRequestUserIdOrNull(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const row = getUserById(userId);
  if (!row) return res.status(404).json({ error: 'User not found' });
  const { name } = req.body;
  if (name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(typeof name === 'string' ? name : null, userId);
  }
  const updated = getUserById(userId)!;
  res.json(toAuthUser(updated));
});

// --- Full state (for frontend hydration when using API) ---
app.get('/api/state', (req, res) => {
  const userId = getRequestUserId(req);
  const trips = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC').all(userId) as TripRow[];
  const tripIds = new Set(trips.map((t) => t.id));
  const allActivities = db.prepare('SELECT * FROM activities').all() as ActivityRow[];
  const allAcc = db.prepare('SELECT * FROM accommodations').all() as AccRow[];
  const allAttr = db.prepare('SELECT * FROM attractions').all() as AttrRow[];
  const allShop = db.prepare('SELECT * FROM shopping_items').all() as ShopRow[];
  const allDoc = db.prepare('SELECT * FROM documents').all() as DocRow[];
  res.json({
    trips: trips.map(toTrip),
    activities: allActivities.filter((a) => tripIds.has(a.trip_id)).map(toActivity),
    accommodations: allAcc.filter((a) => tripIds.has(a.trip_id)).map(toAccommodation),
    attractions: allAttr.filter((a) => tripIds.has(a.trip_id)).map(toAttraction),
    shoppingItems: allShop.filter((s) => tripIds.has(s.trip_id)).map(toShoppingItem),
    documents: allDoc.filter((d) => tripIds.has(d.trip_id)).map(toDocument),
  });
});

// --- Trips ---
app.get('/api/trips', (req, res) => {
  const userId = getRequestUserId(req);
  const rows = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC').all(userId) as TripRow[];
  res.json(rows.map(toTrip));
});

app.get('/api/trips/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(toTrip(row as TripRow));
});

app.post('/api/trips', (req, res) => {
  const userId = getRequestUserId(req);
  const { name, startDate, endDate, destination } = req.body;
  const id = genId();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO trips (id, user_id, name, start_date, end_date, destination, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userId, name, startDate, endDate, destination ?? null, now, now);
  res.status(201).json(toTrip(db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as TripRow));
});

app.put('/api/trips/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { name, startDate, endDate, destination } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE trips SET name = ?, start_date = ?, end_date = ?, destination = ?, updated_at = ? WHERE id = ?'
  ).run(
    name ?? (row as TripRow).name,
    startDate ?? (row as TripRow).start_date,
    endDate ?? (row as TripRow).end_date,
    destination !== undefined ? destination : (row as TripRow).destination,
    now,
    req.params.id
  );
  res.json(toTrip(db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id) as TripRow));
});

app.delete('/api/trips/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// --- Activities ---
app.get('/api/trips/:tripId/activities', (req, res) => {
  const rows = db.prepare('SELECT * FROM activities WHERE trip_id = ? ORDER BY day_index, "order"').all(req.params.tripId) as ActivityRow[];
  res.json(rows.map(toActivity));
});

app.post('/api/trips/:tripId/activities', (req, res) => {
  const tripId = req.params.tripId;
  const { dayIndex, title, time, description, address, order } = req.body;
  const id = genId();
  db.prepare(
    'INSERT INTO activities (id, trip_id, day_index, title, time, description, address, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, dayIndex, title, time ?? null, description ?? null, address ?? null, order ?? 0);
  res.status(201).json(toActivity(db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as ActivityRow));
});

app.put('/api/activities/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const r = row as ActivityRow;
  const u = req.body;
  db.prepare(
    'UPDATE activities SET title = ?, time = ?, description = ?, address = ? WHERE id = ?'
  ).run(u.title ?? r.title, u.time ?? r.time, u.description ?? r.description, u.address ?? r.address, req.params.id);
  res.json(toActivity(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as ActivityRow));
});

app.delete('/api/activities/:id', (req, res) => {
  const r = db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// --- Accommodations ---
app.get('/api/trips/:tripId/accommodations', (req, res) => {
  const rows = db.prepare('SELECT * FROM accommodations WHERE trip_id = ?').all(req.params.tripId) as AccRow[];
  res.json(rows.map(toAccommodation));
});

app.post('/api/trips/:tripId/accommodations', (req, res) => {
  const tripId = req.params.tripId;
  const { name, address, checkInDate, checkOutDate, notes, bookingUrl } = req.body;
  const id = genId();
  db.prepare(
    'INSERT INTO accommodations (id, trip_id, name, address, check_in_date, check_out_date, notes, booking_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, name, address ?? '', checkInDate, checkOutDate, notes ?? null, bookingUrl ?? null);
  res.status(201).json(toAccommodation(db.prepare('SELECT * FROM accommodations WHERE id = ?').get(id) as AccRow));
});

app.put('/api/accommodations/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const r = row as AccRow;
  const u = req.body;
  db.prepare(
    'UPDATE accommodations SET name = ?, address = ?, check_in_date = ?, check_out_date = ?, notes = ?, booking_url = ? WHERE id = ?'
  ).run(u.name ?? r.name, u.address ?? r.address, u.checkInDate ?? r.check_in_date, u.checkOutDate ?? r.check_out_date, u.notes ?? r.notes, u.bookingUrl ?? r.booking_url, req.params.id);
  res.json(toAccommodation(db.prepare('SELECT * FROM accommodations WHERE id = ?').get(req.params.id) as AccRow));
});

app.delete('/api/accommodations/:id', (req, res) => {
  const r = db.prepare('DELETE FROM accommodations WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// --- Attractions ---
app.get('/api/trips/:tripId/attractions', (req, res) => {
  const rows = db.prepare('SELECT * FROM attractions WHERE trip_id = ?').all(req.params.tripId) as AttrRow[];
  res.json(rows.map(toAttraction));
});

app.post('/api/trips/:tripId/attractions', (req, res) => {
  const tripId = req.params.tripId;
  const { name, address, openingHours, price, url, notes, dayIndexes } = req.body;
  const id = genId();
  const dayIndexesStr = JSON.stringify(Array.isArray(dayIndexes) ? dayIndexes : []);
  db.prepare(
    'INSERT INTO attractions (id, trip_id, name, address, opening_hours, price, url, notes, day_indexes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, name, address ?? '', openingHours ?? null, price ?? null, url ?? null, notes ?? null, dayIndexesStr);
  res.status(201).json(toAttraction(db.prepare('SELECT * FROM attractions WHERE id = ?').get(id) as AttrRow));
});

app.put('/api/attractions/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM attractions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const r = row as AttrRow;
  const u = req.body;
  const dayIndexesStr = u.dayIndexes != null ? JSON.stringify(u.dayIndexes) : r.day_indexes;
  db.prepare(
    'UPDATE attractions SET name = ?, address = ?, opening_hours = ?, price = ?, url = ?, notes = ?, day_indexes = ? WHERE id = ?'
  ).run(u.name ?? r.name, u.address ?? r.address, u.openingHours ?? r.opening_hours, u.price ?? r.price, u.url ?? r.url, u.notes ?? r.notes, dayIndexesStr, req.params.id);
  res.json(toAttraction(db.prepare('SELECT * FROM attractions WHERE id = ?').get(req.params.id) as AttrRow));
});

app.delete('/api/attractions/:id', (req, res) => {
  const r = db.prepare('DELETE FROM attractions WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// --- Shopping ---
app.get('/api/trips/:tripId/shopping', (req, res) => {
  const rows = db.prepare('SELECT * FROM shopping_items WHERE trip_id = ? ORDER BY "order"').all(req.params.tripId) as ShopRow[];
  res.json(rows.map(toShoppingItem));
});

app.post('/api/trips/:tripId/shopping', (req, res) => {
  const tripId = req.params.tripId;
  const { text, done, order, category } = req.body;
  const id = genId();
  db.prepare(
    'INSERT INTO shopping_items (id, trip_id, text, done, "order", category) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, text, done ? 1 : 0, order ?? 0, category ?? null);
  res.status(201).json(toShoppingItem(db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id) as ShopRow));
});

app.patch('/api/shopping/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const done = req.body.done ?? (row as ShopRow).done;
  db.prepare('UPDATE shopping_items SET done = ? WHERE id = ?').run(done ? 1 : 0, req.params.id);
  res.json(toShoppingItem(db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id) as ShopRow));
});

app.delete('/api/shopping/:id', (req, res) => {
  const r = db.prepare('DELETE FROM shopping_items WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// --- Documents ---
app.get('/api/trips/:tripId/documents', (req, res) => {
  const rows = db.prepare('SELECT * FROM documents WHERE trip_id = ?').all(req.params.tripId) as DocRow[];
  res.json(rows.map(toDocument));
});

app.post('/api/trips/:tripId/documents', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  const { title, type, fileUrl } = req.body;
  const id = genId();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO documents (id, trip_id, user_id, title, type, file_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, userId, title, type ?? null, fileUrl ?? '', now, now);
  res.status(201).json(toDocument(db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocRow));
});

app.put('/api/documents/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const r = row as DocRow;
  const u = req.body;
  db.prepare('UPDATE documents SET title = ?, type = ?, updated_at = ? WHERE id = ?').run(
    u.title ?? r.title, u.type ?? r.type, new Date().toISOString(), req.params.id
  );
  res.json(toDocument(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as DocRow));
});

app.delete('/api/documents/:id', (req, res) => {
  const r = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Helpers ---
interface TripRow { id: string; user_id: string; name: string; start_date: string; end_date: string; destination: string | null; created_at: string; updated_at: string; }
function toTrip(r: TripRow) {
  return { id: r.id, userId: r.user_id, name: r.name, startDate: r.start_date, endDate: r.end_date, destination: r.destination ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at };
}

interface ActivityRow { id: string; trip_id: string; day_index: number; title: string; time: string | null; description: string | null; address: string | null; lat: number | null; lng: number | null; order: number; }
function toActivity(r: ActivityRow) {
  return { id: r.id, tripId: r.trip_id, dayIndex: r.day_index, title: r.title, time: r.time ?? undefined, description: r.description ?? undefined, address: r.address ?? undefined, lat: r.lat ?? undefined, lng: r.lng ?? undefined, order: r.order };
}

interface AccRow { id: string; trip_id: string; name: string; address: string; check_in_date: string; check_out_date: string; notes: string | null; booking_url: string | null; lat: number | null; lng: number | null; }
function toAccommodation(r: AccRow) {
  return { id: r.id, tripId: r.trip_id, name: r.name, address: r.address, checkInDate: r.check_in_date, checkOutDate: r.check_out_date, notes: r.notes ?? undefined, bookingUrl: r.booking_url ?? undefined, lat: r.lat ?? undefined, lng: r.lng ?? undefined };
}

interface AttrRow { id: string; trip_id: string; name: string; address: string; opening_hours: string | null; price: string | null; url: string | null; notes: string | null; lat: number | null; lng: number | null; day_indexes: string; }
function toAttraction(r: AttrRow) {
  let dayIndexes: number[] = [];
  try { dayIndexes = JSON.parse(r.day_indexes); } catch { /* empty */ }
  return { id: r.id, tripId: r.trip_id, name: r.name, address: r.address, openingHours: r.opening_hours ?? undefined, price: r.price ?? undefined, url: r.url ?? undefined, notes: r.notes ?? undefined, lat: r.lat ?? undefined, lng: r.lng ?? undefined, dayIndexes };
}

interface ShopRow { id: string; trip_id: string; text: string; done: number; order: number; category: string | null; }
function toShoppingItem(r: ShopRow) {
  return { id: r.id, tripId: r.trip_id, text: r.text, done: r.done === 1, order: r.order, category: (r.category as 'ציוד' | 'מסמכים' | 'כללי') ?? undefined };
}

interface DocRow { id: string; trip_id: string; user_id: string; title: string; type: string | null; file_url: string; mime_type: string | null; created_at: string; updated_at: string; }
function toDocument(r: DocRow) {
  return { id: r.id, tripId: r.trip_id, title: r.title, type: (r.type as 'passport' | 'visa' | 'insurance' | 'booking' | 'other') ?? undefined, fileUrl: r.file_url };
}

app.listen(PORT, () => {
  console.log(`Travel API at http://localhost:${PORT}`);
});
