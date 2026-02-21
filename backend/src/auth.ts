import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const DEFAULT_USER_ID = 'u1';

export function getRequestUserId(req: Request): string {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return DEFAULT_USER_ID;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload.userId ?? DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function toAuthUser(r: UserRow): { id: string; email: string; name?: string } {
  return {
    id: r.id,
    email: r.email,
    ...(r.name ? { name: r.name } : {}),
  };
}
