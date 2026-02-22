import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Auth API', () => {
  const unique = () => `u${Date.now()}+${Math.random().toString(36).slice(2)}`;

  describe('POST /api/auth/register', () => {
    it('returns 201 with user and token', async () => {
      const email = `reg-${unique()}@test.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'secret123', name: 'Test User' })
        .expect(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({ email, name: 'Test User' });
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
    });

    it('returns 400 when email or password missing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com' })
        .expect(400);
      await request(app)
        .post('/api/auth/register')
        .send({ password: 'x' })
        .expect(400);
    });

    it('returns 400 when email already registered', async () => {
      const email = `dup-${unique()}@test.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'a' }).expect(201);
      await request(app).post('/api/auth/register').send({ email, password: 'b' }).expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const email = `login-${unique()}@test.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'pass' }).expect(201);
    });

    it('returns 200 with user and token for valid credentials', async () => {
      const email = `login-${unique()}@test.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'mypass' }).expect(201);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'mypass' })
        .expect(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(email);
      expect(res.body).toHaveProperty('token');
    });

    it('returns 401 for wrong password', async () => {
      const email = `wrong-${unique()}@test.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'right' }).expect(201);
      await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    });

    it('returns 401 for unknown email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'any' })
        .expect(401);
    });
  });
});
