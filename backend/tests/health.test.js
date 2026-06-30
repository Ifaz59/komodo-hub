jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
beforeAll(async () => { await initDB(); });

describe('Health & auth middleware', () => {
  test('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
  test('protected route with an invalid token returns 401', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });
});
