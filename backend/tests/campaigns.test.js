jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { tokenFor, adminToken } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Campaigns API', () => {
  test('lists seeded campaigns', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
  test('filters campaigns by status', async () => {
    const res = await request(app).get('/api/campaigns?status=active');
    expect(res.body.every(c => c.status === 'active')).toBe(true);
  });
  test('returns 404 for unknown campaign', async () => {
    const res = await request(app).get('/api/campaigns/9999');
    expect(res.status).toBe(404);
  });
  test('only admin can create a campaign', async () => {
    const userTok = await tokenFor(app, { email: 'camp_user@test.com' });
    const forbidden = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${userTok}`).send({ title: 'X', goal_amount: 1000 });
    expect(forbidden.status).toBe(403);
    const adminTok = await adminToken(app);
    const created = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${adminTok}`).send({ title: 'Mangrove Restoration', goal_amount: 20000 });
    expect(created.status).toBe(201);
    expect(created.body.raised_amount).toBe(0);
  });
  test('validates required fields on create (400)', async () => {
    const adminTok = await adminToken(app);
    const res = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${adminTok}`).send({ description: 'no title or goal' });
    expect(res.status).toBe(400);
  });
});
