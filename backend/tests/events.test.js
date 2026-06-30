jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { tokenFor } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Events API (registration workflow)', () => {
  test('lists seeded events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
  test('registers a user for an upcoming event and rejects duplicates', async () => {
    const token = await tokenFor(app, { email: 'ev1@test.com' });
    const ok = await request(app).post('/api/events/1/register').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(201);
    const dup = await request(app).post('/api/events/1/register').set('Authorization', `Bearer ${token}`);
    expect(dup.status).toBe(400);
    expect(dup.body.error).toMatch(/already registered/i);
  });
  test('cannot register for a completed event (400)', async () => {
    const token = await tokenFor(app, { email: 'ev2@test.com' });
    const res = await request(app).post('/api/events/3/register').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
  test('enforces event capacity (event 2 has capacity 2)', async () => {
    const t1 = await tokenFor(app, { email: 'cap1@test.com' });
    const t2 = await tokenFor(app, { email: 'cap2@test.com' });
    const t3 = await tokenFor(app, { email: 'cap3@test.com' });
    expect((await request(app).post('/api/events/2/register').set('Authorization', `Bearer ${t1}`)).status).toBe(201);
    expect((await request(app).post('/api/events/2/register').set('Authorization', `Bearer ${t2}`)).status).toBe(201);
    const full = await request(app).post('/api/events/2/register').set('Authorization', `Bearer ${t3}`);
    expect(full.status).toBe(400);
    expect(full.body.error).toMatch(/full/i);
  });
  test('a user can cancel a registration (exercises count decrement)', async () => {
    const token = await tokenFor(app, { email: 'ev3@test.com' });
    await request(app).post('/api/events/1/register').set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete('/api/events/1/register').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const cancelAgain = await request(app).delete('/api/events/1/register').set('Authorization', `Bearer ${token}`);
    expect(cancelAgain.status).toBe(404);
  });
  test('lists the events a user registered for', async () => {
    const token = await tokenFor(app, { email: 'ev4@test.com' });
    await request(app).post('/api/events/1/register').set('Authorization', `Bearer ${token}`);
    const res = await request(app).get('/api/events/user/my-events').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});
