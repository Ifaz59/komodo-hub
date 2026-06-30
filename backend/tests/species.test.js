jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { tokenFor, adminToken } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Species API', () => {
  test('lists seeded species', async () => {
    const res = await request(app).get('/api/species');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
  test('filters species by conservation status', async () => {
    const res = await request(app).get('/api/species?status=critically_endangered');
    expect(res.status).toBe(200);
    expect(res.body.every(s => s.conservation_status === 'critically_endangered')).toBe(true);
  });
  test('searches species by name (case-insensitive)', async () => {
    const res = await request(app).get('/api/species?search=komodo');
    expect(res.status).toBe(200);
    expect(res.body.some(s => /komodo/i.test(s.name))).toBe(true);
  });
  test('returns 404 for an unknown species id', async () => {
    const res = await request(app).get('/api/species/9999');
    expect(res.status).toBe(404);
  });
  test('blocks species creation without a token (401)', async () => {
    const res = await request(app).post('/api/species').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
  test('blocks species creation for a normal user (403)', async () => {
    const token = await tokenFor(app, { email: 'normal_sp@test.com' });
    const res = await request(app).post('/api/species').set('Authorization', `Bearer ${token}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });
  test('admin can create, update and delete a species', async () => {
    const token = await adminToken(app);
    const created = await request(app).post('/api/species').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Javan Rhino', scientific_name: 'Rhinoceros sondaicus', conservation_status: 'critically_endangered', population_estimate: 72 });
    expect(created.status).toBe(201);
    const id = created.body.id;
    const updated = await request(app).put(`/api/species/${id}`).set('Authorization', `Bearer ${token}`).send({ population_estimate: 75 });
    expect(updated.status).toBe(200);
    expect(updated.body.population_estimate).toBe(75);
    const del = await request(app).delete(`/api/species/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });
});
