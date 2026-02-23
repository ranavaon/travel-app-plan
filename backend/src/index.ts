import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db.js';
import { getRequestUserId, getRequestUserIdOrNull, signToken, getUserByEmail, getUserById, toAuthUser, getOrCreateUserForOAuth } from './auth.js';
import { genId, randomToken, getTripRole, getTripIdsForUser, canEditTrip, canManageMembers, computeDaysFromTrip } from './helpers.js';
import {
  type TripRole, type TripRow, type ActivityRow, type AccRow, type AttrRow, type ShopRow, type DocRow, type ExpenseRow, type PinnedPlaceRow, type FlightRow,
  toTrip, toActivity, toAccommodation, toAttraction, toShoppingItem, toDocument, toExpense, toPinnedPlace, toFlight,
} from './models.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// AUTH
// ============================================================

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (getUserByEmail(email)) return res.status(400).json({ error: 'Email already registered' });
  const id = genId();
  const password_hash = bcrypt.hashSync(password, 10);
  const created_at = new Date().toISOString();
  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)').run(id, email, password_hash, name ?? null, created_at);
  res.status(201).json({ user: toAuthUser(getUserById(id)!), token: signToken(id) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const row = getUserByEmail(email);
  if (!row || !row.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ user: toAuthUser(row), token: signToken(row.id) });
});

app.post('/api/auth/google', async (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) return res.status(501).json({ error: 'Google sign-in is not configured' });
  const { id_token } = req.body;
  if (!id_token || typeof id_token !== 'string') return res.status(400).json({ error: 'id_token required' });
  try {
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(401).json({ error: 'Invalid token' });
    let row = getUserByEmail(payload.email);
    if (!row) {
      const id = genId();
      db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)').run(id, payload.email, '', payload.name ?? null, new Date().toISOString());
      row = getUserById(id)!;
    }
    res.json({ user: toAuthUser(row), token: signToken(row.id) });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const appleJwksClient = JwksClient({ jwksUri: APPLE_JWKS_URI, cache: true, cacheMaxAge: 600000 });

app.post('/api/auth/apple', (req, res) => {
  if (!APPLE_CLIENT_ID) return res.status(501).json({ error: 'Apple Sign In is not configured' });
  const id_token = req.body?.id_token;
  if (!id_token || typeof id_token !== 'string') return res.status(400).json({ error: 'id_token required' });
  const getKey = (header: jwt.JwtHeader, cb: (err: Error | null, key?: string) => void) => {
    if (!header.kid) return cb(new Error('Missing kid'));
    appleJwksClient.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return cb(err ?? new Error('Signing key not found'));
      cb(null, key.getPublicKey());
    });
  };
  jwt.verify(id_token, getKey as unknown as jwt.Secret, { algorithms: ['RS256'], audience: APPLE_CLIENT_ID, issuer: 'https://appleid.apple.com' }, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid Apple id_token' });
    const p = payload as { sub?: string; email?: string; name?: string };
    if (!p.sub) return res.status(401).json({ error: 'Invalid Apple id_token: missing sub' });
    const email = p.email?.trim() || `apple_${p.sub}@oauth.local`;
    const row = getOrCreateUserForOAuth(email, p.name);
    res.json({ user: toAuthUser(row), token: signToken(row.id) });
  });
});

app.patch('/api/users/me', (req, res) => {
  const userId = getRequestUserIdOrNull(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const row = getUserById(userId);
  if (!row) return res.status(404).json({ error: 'User not found' });
  if (req.body.name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(typeof req.body.name === 'string' ? req.body.name : null, userId);
  }
  res.json(toAuthUser(getUserById(userId)!));
});

// ============================================================
// FULL STATE (hydration)
// ============================================================

app.get('/api/state', (req, res) => {
  const userId = getRequestUserId(req);
  const tripIds = getTripIdsForUser(userId);
  const trips = tripIds.length === 0 ? [] : (db.prepare(`SELECT * FROM trips WHERE id IN (${tripIds.map(() => '?').join(',')}) ORDER BY created_at DESC`).all(...tripIds) as TripRow[]);
  const tripIdSet = new Set(tripIds);
  const filter = <T extends { trip_id: string }>(rows: T[]) => rows.filter((r) => tripIdSet.has(r.trip_id));
  res.json({
    trips: trips.map((t) => toTrip(t, getTripRole(t.id, userId) ?? undefined)),
    activities: filter(db.prepare('SELECT * FROM activities').all() as ActivityRow[]).map(toActivity),
    accommodations: filter(db.prepare('SELECT * FROM accommodations').all() as AccRow[]).map(toAccommodation),
    attractions: filter(db.prepare('SELECT * FROM attractions').all() as AttrRow[]).map(toAttraction),
    shoppingItems: filter(db.prepare('SELECT * FROM shopping_items').all() as ShopRow[]).map(toShoppingItem),
    documents: filter(db.prepare('SELECT * FROM documents').all() as DocRow[]).map(toDocument),
    expenses: filter(db.prepare('SELECT * FROM expenses').all() as ExpenseRow[]).map(toExpense),
    pinnedPlaces: filter(db.prepare('SELECT * FROM pinned_places').all() as PinnedPlaceRow[]).map(toPinnedPlace),
    flights: filter(db.prepare('SELECT * FROM flights').all() as FlightRow[]).map(toFlight),
  });
});

// ============================================================
// TRIPS
// ============================================================

app.get('/api/trips', (req, res) => {
  const userId = getRequestUserId(req);
  const tripIds = getTripIdsForUser(userId);
  if (tripIds.length === 0) return res.json([]);
  const rows = db.prepare(`SELECT * FROM trips WHERE id IN (${tripIds.map(() => '?').join(',')}) ORDER BY created_at DESC`).all(...tripIds) as TripRow[];
  res.json(rows.map((t) => toTrip(t, getTripRole(t.id, userId) ?? undefined)));
});

app.get('/api/trips/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id) as TripRow | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const role = getTripRole(req.params.id, userId);
  if (!role) return res.status(404).json({ error: 'Not found' });
  res.json(toTrip(row, role));
});

app.post('/api/trips', (req, res) => {
  const userId = getRequestUserId(req);
  const { name, startDate, endDate, destination, tags, budget } = req.body;
  const id = genId();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO trips (id, user_id, name, start_date, end_date, destination, created_at, updated_at, tags, budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, userId, name, startDate, endDate, destination ?? null, now, now, Array.isArray(tags) ? JSON.stringify(tags) : null, budget ?? null,
  );
  res.status(201).json(toTrip(db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as TripRow, 'owner'));
});

app.put('/api/trips/:id', (req, res) => {
  const userId = getRequestUserId(req);
  if (!canEditTrip(req.params.id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const r = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id) as TripRow | undefined;
  if (!r) return res.status(404).json({ error: 'Not found' });
  const { name, startDate, endDate, destination, tags, budget } = req.body;
  const now = new Date().toISOString();
  const tagsStr = tags !== undefined ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : r.tags;
  db.prepare('UPDATE trips SET name = ?, start_date = ?, end_date = ?, destination = ?, updated_at = ?, tags = ?, budget = ? WHERE id = ?').run(
    name ?? r.name, startDate ?? r.start_date, endDate ?? r.end_date, destination !== undefined ? destination : r.destination,
    now, tagsStr ?? null, budget !== undefined ? budget : r.budget ?? null, req.params.id,
  );
  res.json(toTrip(db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id) as TripRow, getTripRole(req.params.id, userId) ?? undefined));
});

app.delete('/api/trips/:id', (req, res) => {
  const userId = getRequestUserId(req);
  if (!canManageMembers(req.params.id, userId)) return res.status(403).json({ error: 'Only owner can delete trip' });
  const r = db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// ============================================================
// SHARE (read-only link)
// ============================================================

app.post('/api/trips/:id/share', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.id;
  if (!canManageMembers(tripId, userId)) return res.status(403).json({ error: 'Only owner can create share link' });
  if (!db.prepare('SELECT 1 FROM trips WHERE id = ?').get(tripId)) return res.status(404).json({ error: 'Not found' });
  const token = randomToken();
  db.prepare('INSERT INTO share_tokens (token, trip_id, created_at) VALUES (?, ?, ?)').run(token, tripId, new Date().toISOString());
  res.status(201).json({ shareToken: token });
});

app.get('/api/share/:token', (req, res) => {
  const row = db.prepare('SELECT * FROM share_tokens WHERE token = ?').get(req.params.token) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Link not found or expired' });
  const tripRow = db.prepare('SELECT * FROM trips WHERE id = ?').get(row.trip_id) as TripRow | undefined;
  if (!tripRow) return res.status(404).json({ error: 'Trip not found' });
  res.json({
    trip: toTrip(tripRow),
    days: computeDaysFromTrip(tripRow),
    activities: (db.prepare('SELECT * FROM activities WHERE trip_id = ?').all(row.trip_id) as ActivityRow[]).map(toActivity),
    accommodations: (db.prepare('SELECT * FROM accommodations WHERE trip_id = ?').all(row.trip_id) as AccRow[]).map(toAccommodation),
    attractions: (db.prepare('SELECT * FROM attractions WHERE trip_id = ?').all(row.trip_id) as AttrRow[]).map(toAttraction),
    shoppingItems: (db.prepare('SELECT * FROM shopping_items WHERE trip_id = ?').all(row.trip_id) as ShopRow[]).map(toShoppingItem),
    flights: (db.prepare('SELECT * FROM flights WHERE trip_id = ?').all(row.trip_id) as FlightRow[]).map(toFlight),
  });
});

// ============================================================
// TRIP MEMBERS
// ============================================================

app.get('/api/trips/:id/members', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.id;
  if (!getTripRole(tripId, userId)) return res.status(404).json({ error: 'Not found' });
  const trip = db.prepare('SELECT user_id FROM trips WHERE id = ?').get(tripId) as { user_id: string } | undefined;
  if (!trip) return res.status(404).json({ error: 'Not found' });
  const ownerRow = getUserById(trip.user_id);
  const members: { userId: string; email: string; name?: string; role: string }[] = ownerRow
    ? [{ userId: ownerRow.id, email: ownerRow.email, name: ownerRow.name ?? undefined, role: 'owner' }]
    : [];
  const rows = db.prepare('SELECT user_id, role FROM trip_members WHERE trip_id = ?').all(tripId) as { user_id: string; role: string }[];
  for (const r of rows) {
    const u = getUserById(r.user_id);
    members.push({ userId: r.user_id, email: u?.email ?? '', name: u?.name ?? undefined, role: r.role });
  }
  res.json({ members });
});

app.post('/api/trips/:id/members', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.id;
  if (!canManageMembers(tripId, userId)) return res.status(403).json({ error: 'Only owner can invite members' });
  const { email, role } = req.body;
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email required' });
  const allowedRole = role === 'viewer' ? 'viewer' : 'participant';
  const invitee = getUserByEmail(email.trim());
  if (!invitee) return res.status(404).json({ error: 'User not found with this email' });
  if (invitee.id === userId) return res.status(400).json({ error: 'Cannot add yourself' });
  const trip = db.prepare('SELECT user_id FROM trips WHERE id = ?').get(tripId) as { user_id: string } | undefined;
  if (!trip || invitee.id === trip.user_id) return res.status(400).json({ error: 'Owner is already a member' });
  try {
    db.prepare('INSERT INTO trip_members (trip_id, user_id, role, created_at) VALUES (?, ?, ?, ?)').run(tripId, invitee.id, allowedRole, new Date().toISOString());
  } catch {
    return res.status(400).json({ error: 'User is already a member of this trip' });
  }
  res.status(201).json({ member: { userId: invitee.id, email: invitee.email, name: invitee.name ?? undefined, role: allowedRole } });
});

app.patch('/api/trips/:id/members/:memberId', (req, res) => {
  const userId = getRequestUserId(req);
  const { id: tripId, memberId } = req.params;
  if (!canManageMembers(tripId, userId)) return res.status(403).json({ error: 'Only owner can change roles' });
  const newRole = req.body.role === 'viewer' ? 'viewer' : 'participant';
  const r = db.prepare('UPDATE trip_members SET role = ? WHERE trip_id = ? AND user_id = ?').run(newRole, tripId, memberId);
  if (r.changes === 0) return res.status(404).json({ error: 'Member not found' });
  const u = getUserById(memberId);
  res.json({ member: { userId: memberId, email: u?.email ?? '', name: u?.name ?? undefined, role: newRole } });
});

app.delete('/api/trips/:id/members/:memberId', (req, res) => {
  const userId = getRequestUserId(req);
  const { id: tripId, memberId } = req.params;
  if (!canManageMembers(tripId, userId)) return res.status(403).json({ error: 'Only owner can remove members' });
  const r = db.prepare('DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?').run(tripId, memberId);
  if (r.changes === 0) return res.status(404).json({ error: 'Member not found' });
  res.status(204).send();
});

// ============================================================
// INVITE TOKENS
// ============================================================

app.post('/api/trips/:id/invite', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.id;
  if (!canManageMembers(tripId, userId)) return res.status(403).json({ error: 'Only owner can create invite links' });
  const role = req.body.role === 'viewer' ? 'viewer' : 'participant';
  const token = randomToken();
  db.prepare('INSERT INTO invite_tokens (token, trip_id, role, created_at) VALUES (?, ?, ?, ?)').run(token, tripId, role, new Date().toISOString());
  res.status(201).json({ token, role });
});

app.get('/api/invite/:token', (req, res) => {
  const row = db.prepare('SELECT token, trip_id, role FROM invite_tokens WHERE token = ?').get(req.params.token) as { trip_id: string; role: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Invite not found or expired' });
  const trip = db.prepare('SELECT id, name, destination, start_date, end_date FROM trips WHERE id = ?').get(row.trip_id) as { id: string; name: string; destination?: string; start_date: string; end_date: string } | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json({ tripId: trip.id, tripName: trip.name, destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date, role: row.role });
});

app.post('/api/invite/:token/accept', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT token, trip_id, role FROM invite_tokens WHERE token = ?').get(req.params.token) as { trip_id: string; role: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Invite not found or expired' });
  const trip = db.prepare('SELECT user_id FROM trips WHERE id = ?').get(row.trip_id) as { user_id: string } | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.user_id === userId) return res.json({ ok: true, tripId: row.trip_id });
  if (db.prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?').get(row.trip_id, userId)) return res.json({ ok: true, tripId: row.trip_id });
  db.prepare('INSERT INTO trip_members (trip_id, user_id, role, created_at) VALUES (?, ?, ?, ?)').run(row.trip_id, userId, row.role, new Date().toISOString());
  res.json({ ok: true, tripId: row.trip_id });
});

// ============================================================
// REMINDERS
// ============================================================

app.get('/api/reminders', (req, res) => {
  const userId = getRequestUserId(req);
  const rows = db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at').all(userId) as { id: string; trip_id: string; title: string; remind_at: string; fired: number; created_at: string }[];
  res.json(rows.map((r) => ({ id: r.id, tripId: r.trip_id, title: r.title, remindAt: r.remind_at, fired: !!r.fired, createdAt: r.created_at })));
});

app.post('/api/trips/:tripId/reminders', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!getTripRole(tripId, userId)) return res.status(404).json({ error: 'Not found' });
  const { title, remindAt } = req.body;
  if (!title || !remindAt) return res.status(400).json({ error: 'title and remindAt required' });
  const id = genId();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO reminders (id, trip_id, user_id, title, remind_at, fired, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)').run(id, tripId, userId, title, remindAt, now);
  res.status(201).json({ id, tripId, title, remindAt, fired: false, createdAt: now });
});

app.patch('/api/reminders/:id/fire', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('UPDATE reminders SET fired = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.delete('/api/reminders/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// ============================================================
// ACTIVITIES
// ============================================================

app.get('/api/trips/:tripId/activities', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM activities WHERE trip_id = ? ORDER BY day_index, "order"').all(req.params.tripId) as ActivityRow[]).map(toActivity));
});

app.post('/api/trips/:tripId/activities', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { dayIndex, title, time, description, address, order } = req.body;
  const id = genId();
  db.prepare('INSERT INTO activities (id, trip_id, day_index, title, time, description, address, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, tripId, dayIndex, title, time ?? null, description ?? null, address ?? null, order ?? 0);
  res.status(201).json(toActivity(db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as ActivityRow));
});

app.put('/api/activities/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as ActivityRow | undefined;
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(r.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const u = req.body;
  db.prepare('UPDATE activities SET title = ?, time = ?, description = ?, address = ?, "order" = ? WHERE id = ?').run(
    u.title ?? r.title, u.time ?? r.time, u.description ?? r.description, u.address ?? r.address, u.order !== undefined ? Number(u.order) : r.order, req.params.id,
  );
  res.json(toActivity(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as ActivityRow));
});

app.delete('/api/activities/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM activities WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// ACCOMMODATIONS
// ============================================================

app.get('/api/trips/:tripId/accommodations', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM accommodations WHERE trip_id = ?').all(req.params.tripId) as AccRow[]).map(toAccommodation));
});

app.post('/api/trips/:tripId/accommodations', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { name, address, checkInDate, checkOutDate, notes, bookingUrl, lat, lng } = req.body;
  const id = genId();
  const safeNum = (v: unknown) => typeof v === 'number' && !Number.isNaN(v) ? v : null;
  db.prepare('INSERT INTO accommodations (id, trip_id, name, address, check_in_date, check_out_date, notes, booking_url, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, tripId, name, address ?? '', checkInDate, checkOutDate, notes ?? null, bookingUrl ?? null, safeNum(lat), safeNum(lng),
  );
  res.status(201).json(toAccommodation(db.prepare('SELECT * FROM accommodations WHERE id = ?').get(id) as AccRow));
});

app.put('/api/accommodations/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(req.params.id) as AccRow | undefined;
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(r.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const u = req.body;
  const safeNum = (v: unknown, fallback: number | null) => v !== undefined ? (typeof v === 'number' && !Number.isNaN(v) ? v : null) : fallback;
  db.prepare('UPDATE accommodations SET name = ?, address = ?, check_in_date = ?, check_out_date = ?, notes = ?, booking_url = ?, lat = ?, lng = ? WHERE id = ?').run(
    u.name ?? r.name, u.address ?? r.address, u.checkInDate ?? r.check_in_date, u.checkOutDate ?? r.check_out_date,
    u.notes ?? r.notes, u.bookingUrl ?? r.booking_url, safeNum(u.lat, r.lat), safeNum(u.lng, r.lng), req.params.id,
  );
  res.json(toAccommodation(db.prepare('SELECT * FROM accommodations WHERE id = ?').get(req.params.id) as AccRow));
});

app.delete('/api/accommodations/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM accommodations WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM accommodations WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// ATTRACTIONS
// ============================================================

app.get('/api/trips/:tripId/attractions', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM attractions WHERE trip_id = ?').all(req.params.tripId) as AttrRow[]).map(toAttraction));
});

app.post('/api/trips/:tripId/attractions', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { name, address, openingHours, price, url, notes, dayIndexes, lat, lng } = req.body;
  const id = genId();
  const safeNum = (v: unknown) => typeof v === 'number' && !Number.isNaN(v) ? v : null;
  db.prepare('INSERT INTO attractions (id, trip_id, name, address, opening_hours, price, url, notes, lat, lng, day_indexes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, tripId, name, address ?? '', openingHours ?? null, price ?? null, url ?? null, notes ?? null, safeNum(lat), safeNum(lng), JSON.stringify(Array.isArray(dayIndexes) ? dayIndexes : []),
  );
  res.status(201).json(toAttraction(db.prepare('SELECT * FROM attractions WHERE id = ?').get(id) as AttrRow));
});

app.put('/api/attractions/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('SELECT * FROM attractions WHERE id = ?').get(req.params.id) as AttrRow | undefined;
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(r.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const u = req.body;
  const safeNum = (v: unknown, fallback: number | null) => v !== undefined ? (typeof v === 'number' && !Number.isNaN(v) ? v : null) : fallback;
  db.prepare('UPDATE attractions SET name = ?, address = ?, opening_hours = ?, price = ?, url = ?, notes = ?, lat = ?, lng = ?, day_indexes = ? WHERE id = ?').run(
    u.name ?? r.name, u.address ?? r.address, u.openingHours ?? r.opening_hours, u.price ?? r.price, u.url ?? r.url, u.notes ?? r.notes,
    safeNum(u.lat, r.lat), safeNum(u.lng, r.lng), u.dayIndexes != null ? JSON.stringify(u.dayIndexes) : r.day_indexes, req.params.id,
  );
  res.json(toAttraction(db.prepare('SELECT * FROM attractions WHERE id = ?').get(req.params.id) as AttrRow));
});

app.delete('/api/attractions/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM attractions WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM attractions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// SHOPPING
// ============================================================

app.get('/api/trips/:tripId/shopping', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM shopping_items WHERE trip_id = ? ORDER BY "order"').all(req.params.tripId) as ShopRow[]).map(toShoppingItem));
});

app.post('/api/trips/:tripId/shopping', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { text, done, order, category } = req.body;
  const id = genId();
  db.prepare('INSERT INTO shopping_items (id, trip_id, text, done, "order", category) VALUES (?, ?, ?, ?, ?, ?)').run(id, tripId, text, done ? 1 : 0, order ?? 0, category ?? null);
  res.status(201).json(toShoppingItem(db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id) as ShopRow));
});

app.patch('/api/shopping/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id) as ShopRow | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('UPDATE shopping_items SET done = ? WHERE id = ?').run(req.body.done ? 1 : 0, req.params.id);
  res.json(toShoppingItem(db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id) as ShopRow));
});

app.delete('/api/shopping/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM shopping_items WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM shopping_items WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// DOCUMENTS
// ============================================================

app.get('/api/trips/:tripId/documents', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM documents WHERE trip_id = ?').all(req.params.tripId) as DocRow[]).map(toDocument));
});

app.post('/api/trips/:tripId/documents', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { title, type, fileUrl } = req.body;
  const id = genId();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO documents (id, trip_id, user_id, title, type, file_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, tripId, userId, title, type ?? null, fileUrl ?? '', now, now);
  res.status(201).json(toDocument(db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocRow));
});

app.put('/api/documents/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const r = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as DocRow | undefined;
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(r.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const u = req.body;
  db.prepare('UPDATE documents SET title = ?, type = ?, updated_at = ? WHERE id = ?').run(u.title ?? r.title, u.type ?? r.type, new Date().toISOString(), req.params.id);
  res.json(toDocument(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as DocRow));
});

app.delete('/api/documents/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM documents WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// EXPENSES
// ============================================================

app.get('/api/trips/:tripId/expenses', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at').all(req.params.tripId) as ExpenseRow[]).map(toExpense));
});

app.post('/api/trips/:tripId/expenses', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!db.prepare('SELECT 1 FROM trips WHERE id = ?').get(tripId)) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { description, amount } = req.body;
  const id = genId();
  db.prepare('INSERT INTO expenses (id, trip_id, description, amount, created_at) VALUES (?, ?, ?, ?, ?)').run(id, tripId, description ?? '', Number(amount) ?? 0, new Date().toISOString());
  res.status(201).json(toExpense(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow));
});

app.delete('/api/expenses/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM expenses WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// PINNED PLACES
// ============================================================

app.get('/api/trips/:tripId/pinned-places', (req, res) => {
  const userId = getRequestUserId(req);
  if (!getTripRole(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM pinned_places WHERE trip_id = ? ORDER BY created_at').all(req.params.tripId) as PinnedPlaceRow[]).map(toPinnedPlace));
});

app.post('/api/trips/:tripId/pinned-places', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!canEditTrip(tripId, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  const { name, address, lat, lng } = req.body;
  const id = genId();
  db.prepare('INSERT INTO pinned_places (id, trip_id, name, address, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, tripId, name ?? '', address ?? null, lat ?? null, lng ?? null, new Date().toISOString());
  res.status(201).json(toPinnedPlace(db.prepare('SELECT * FROM pinned_places WHERE id = ?').get(id) as PinnedPlaceRow));
});

app.delete('/api/pinned-places/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const row = db.prepare('SELECT trip_id FROM pinned_places WHERE id = ?').get(req.params.id) as { trip_id: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canEditTrip(row.trip_id, userId)) return res.status(403).json({ error: 'Only owner or participant can edit' });
  db.prepare('DELETE FROM pinned_places WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ============================================================
// FLIGHTS
// ============================================================

app.get('/api/trips/:tripId/flights', (req, res) => {
  const userId = getRequestUserId(req);
  if (!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(req.params.tripId, userId)) return res.status(404).json({ error: 'Not found' });
  res.json((db.prepare('SELECT * FROM flights WHERE trip_id = ?').all(req.params.tripId) as FlightRow[]).map(toFlight));
});

app.post('/api/trips/:tripId/flights', (req, res) => {
  const userId = getRequestUserId(req);
  const tripId = req.params.tripId;
  if (!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId)) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const id = genId();
  db.prepare(
    `INSERT INTO flights (id, trip_id, flight_number, airline, airport_departure, airport_arrival, departure_datetime, arrival_datetime, gate, ticket_url, ticket_notes, seat, cabin_class, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, tripId, b.flightNumber ?? null, b.airline ?? null, b.airportDeparture ?? null, b.airportArrival ?? null, b.departureDateTime ?? null, b.arrivalDateTime ?? null, b.gate ?? null, b.ticketUrl ?? null, b.ticketNotes ?? null, b.seat ?? null, b.cabinClass ?? null, b.durationMinutes ?? null, b.notes ?? null);
  res.status(201).json(toFlight(db.prepare('SELECT * FROM flights WHERE id = ?').get(id) as FlightRow));
});

app.put('/api/flights/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM flights WHERE id = ?').get(req.params.id) as FlightRow | undefined;
  if (!r) return res.status(404).json({ error: 'Not found' });
  const u = req.body;
  db.prepare(
    `UPDATE flights SET flight_number = ?, airline = ?, airport_departure = ?, airport_arrival = ?, departure_datetime = ?, arrival_datetime = ?, gate = ?, ticket_url = ?, ticket_notes = ?, seat = ?, cabin_class = ?, duration_minutes = ?, notes = ? WHERE id = ?`,
  ).run(
    u.flightNumber ?? r.flight_number, u.airline ?? r.airline, u.airportDeparture ?? r.airport_departure, u.airportArrival ?? r.airport_arrival,
    u.departureDateTime ?? r.departure_datetime, u.arrivalDateTime ?? r.arrival_datetime, u.gate ?? r.gate, u.ticketUrl ?? r.ticket_url,
    u.ticketNotes ?? r.ticket_notes, u.seat ?? r.seat, u.cabinClass ?? r.cabin_class, u.durationMinutes ?? r.duration_minutes, u.notes ?? r.notes, req.params.id,
  );
  res.json(toFlight(db.prepare('SELECT * FROM flights WHERE id = ?').get(req.params.id) as FlightRow));
});

app.delete('/api/flights/:id', (req, res) => {
  const r = db.prepare('DELETE FROM flights WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// ============================================================
// HEALTH & STATIC
// ============================================================

app.get('/api/health', (_req, res) => res.json({ ok: true }));

export { app };
export type { TripRole };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Travel API at http://localhost:${PORT}`);
  });
}
