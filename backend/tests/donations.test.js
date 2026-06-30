jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { tokenFor } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Donations API (transactional)', () => {
  test('requires authentication (401)', async () => {
    const res = await request(app).post('/api/donations').send({ campaign_id: 1, amount: 10 });
    expect(res.status).toBe(401);
  });
  test('rejects a non-positive amount (400)', async () => {
    const token = await tokenFor(app, { email: 'don1@test.com' });
    const res = await request(app).post('/api/donations').set('Authorization', `Bearer ${token}`).send({ campaign_id: 1, amount: 0 });
    expect(res.status).toBe(400);
  });
  test('rejects donating to a non-existent/inactive campaign (404)', async () => {
    const token = await tokenFor(app, { email: 'don2@test.com' });
    const res = await request(app).post('/api/donations').set('Authorization', `Bearer ${token}`).send({ campaign_id: 9999, amount: 50 });
    expect(res.status).toBe(404);
  });
  test('records a donation and atomically increases raised_amount', async () => {
    const token = await tokenFor(app, { email: 'don3@test.com' });
    const before = (await request(app).get('/api/campaigns/1')).body.raised_amount;
    const res = await request(app).post('/api/donations').set('Authorization', `Bearer ${token}`).send({ campaign_id: 1, amount: 100, message: 'Go tigers' });
    expect(res.status).toBe(201);
    expect(res.body.donation.amount).toBe(100);
    const after = (await request(app).get('/api/campaigns/1')).body.raised_amount;
    expect(after).toBe(before + 100);
  });
  test('a user can view their donation history', async () => {
    const token = await tokenFor(app, { email: 'don4@test.com' });
    await request(app).post('/api/donations').set('Authorization', `Bearer ${token}`).send({ campaign_id: 1, amount: 25 });
    const res = await request(app).get('/api/donations/my').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].campaign_title).toBeDefined();
  });
});
