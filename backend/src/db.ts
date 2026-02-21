import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = process.env.SQLITE_PATH ?? join(process.cwd(), 'data.sqlite');
export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    destination TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    day_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    time TEXT,
    description TEXT,
    address TEXT,
    lat REAL,
    lng REAL,
    "order" INTEGER NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS accommodations (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    notes TEXT,
    booking_url TEXT,
    lat REAL,
    lng REAL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attractions (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    opening_hours TEXT,
    price TEXT,
    url TEXT,
    notes TEXT,
    lat REAL,
    lng REAL,
    day_indexes TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    category TEXT,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT,
    file_url TEXT NOT NULL,
    mime_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_activities_trip ON activities(trip_id);
  CREATE INDEX IF NOT EXISTS idx_accommodations_trip ON accommodations(trip_id);
  CREATE INDEX IF NOT EXISTS idx_attractions_trip ON attractions(trip_id);
  CREATE INDEX IF NOT EXISTS idx_shopping_trip ON shopping_items(trip_id);
  CREATE INDEX IF NOT EXISTS idx_documents_trip ON documents(trip_id);
`);

// Default user for MVP (no auth flow yet)
const defaultUserId = 'u1';
const userRow = db.prepare('SELECT id FROM users WHERE id = ?').get(defaultUserId);
if (!userRow) {
  db.prepare(
    'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)'
  ).run(defaultUserId, 'user@example.com', '', new Date().toISOString());
}
