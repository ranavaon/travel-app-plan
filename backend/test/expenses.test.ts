import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Expenses API', () => {
  const unique = () => `u${Date.now()}+${Math.random().toString(36).slice(2)}`;

  async function registerAndGetToken(): Promise<{ token: string; userId: string }> {
    const email = `exp-${unique()}@test.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret' })
      .expect(201);
    return { token: res.body.token, userId: res.body.user.id };
  }

  async function createTrip(token: string): Promise<string> {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Trip',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        destination: 'City',
      })
      .expect(201);
    return res.body.id;
  }

  it('POST /api/trips/:tripId/expenses returns 201 and correct body with amount as number', async () => {
    const { token } = await registerAndGetToken();
    const tripId = await createTrip(token);
    const res = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Coffee', amount: 25 })
      .expect(201);
    expect(res.body).toMatchObject({
      tripId,
      description: 'Coffee',
      amount: 25,
    });
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('createdAt');
    expect(typeof res.body.amount).toBe('number');
  });

  it('POST /api/trips/:tripId/expenses parses string amount as number', async () => {
    const { token } = await registerAndGetToken();
    const tripId = await createTrip(token);
    const res = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Lunch', amount: '99.5' })
      .expect(201);
    expect(res.body.amount).toBe(99.5);
    expect(typeof res.body.amount).toBe('number');
  });

  it('POST /api/trips/:tripId/expenses returns 404 for non-existent trip', async () => {
    const { token } = await registerAndGetToken();
    const fakeTripId = 'non-existent-trip-id-12345';
    await request(app)
      .post(`/api/trips/${fakeTripId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'X', amount: 1 })
      .expect(404);
  });

  it('GET /api/trips/:tripId/expenses returns list including created expense', async () => {
    const { token } = await registerAndGetToken();
    const tripId = await createTrip(token);
    const postRes = await request(app)
      .post(`/api/trips/${tripId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Item', amount: 10 })
      .expect(201);
    const getRes = await request(app)
      .get(`/api/trips/${tripId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    const found = getRes.body.find((e: { id: string }) => e.id === postRes.body.id);
    expect(found).toBeDefined();
    expect(found).toMatchObject({ description: 'Item', amount: 10, tripId });
  });
});
