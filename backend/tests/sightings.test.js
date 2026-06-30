jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { tokenFor, adminToken } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Sightings API', () => {
  test('requires authentication to report a sighting (401)', async () => {
    const res = await request(app).post('/api/sightings').send({ location: 'Komodo', sighting_date: '2026-04-01' });
    expect(res.status).toBe(401);
  });
  test('validates required fields (400)', async () => {
    const token = await tokenFor(app, { email: 'rep1@test.com' });
    const res = await request(app).post('/api/sightings').set('Authorization', `Bearer ${token}`).send({ description: 'no location' });
    expect(res.status).toBe(400);
  });
  test('creates a sighting with status pending', async () => {
    const token = await tokenFor(app, { email: 'rep2@test.com' });
    const res = await request(app).post('/api/sightings').set('Authorization', `Bearer ${token}`)
      .send({ species_id: 1, location: 'Komodo National Park', sighting_date: '2026-04-01', description: 'Adult dragon' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });
  test('lists sightings publicly with reporter & species names', async () => {
    const res = await request(app).get('/api/sightings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  test('a user can list their own sightings', async () => {
    const token = await tokenFor(app, { email: 'mine@test.com' });
    await request(app).post('/api/sightings').set('Authorization', `Bearer ${token}`).send({ location: 'Bali', sighting_date: '2026-04-02' });
    const res = await request(app).get('/api/sightings/user/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
  test('admin can verify a sighting; invalid status is rejected', async () => {
    const userTok = await tokenFor(app, { email: 'rep3@test.com' });
    const created = await request(app).post('/api/sightings').set('Authorization', `Bearer ${userTok}`).send({ location: 'Sumatra', sighting_date: '2026-04-03' });
    const adminTok = await adminToken(app);
    const ok = await request(app).put(`/api/sightings/${created.body.id}/status`).set('Authorization', `Bearer ${adminTok}`).send({ status: 'verified' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('verified');
    const bad = await request(app).put(`/api/sightings/${created.body.id}/status`).set('Authorization', `Bearer ${adminTok}`).send({ status: 'banana' });
    expect(bad.status).toBe(400);
  });
});
