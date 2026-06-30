jest.mock('../config/db', () => require('./testdb'));
const request = require('supertest');
const { initDB } = require('../config/db');
const app = require('./app');
const { tokenFor, adminToken, register } = require('./helpers');
beforeAll(async () => { await initDB(); });

describe('Admin API', () => {
  test('blocks non-admins from stats (403)', async () => {
    const token = await tokenFor(app, { email: 'adm_user@test.com' });
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
  test('returns aggregated dashboard stats for admin', async () => {
    const token = await adminToken(app);
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalSpecies');
    expect(typeof res.body.totalDonations).toBe('number');
  });
  test('admin can list users and change a role', async () => {
    const token = await adminToken(app);
    const r = await register(app, { email: 'promote@test.com' });
    const id = r.res.body.user.id;
    const res = await request(app).put(`/api/admin/users/${id}/role`).set('Authorization', `Bearer ${token}`).send({ role: 'researcher' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('researcher');
  });
  test('rejects an invalid role (400)', async () => {
    const token = await adminToken(app);
    const r = await register(app, { email: 'badrole@test.com' });
    const res = await request(app).put(`/api/admin/users/${r.res.body.user.id}/role`).set('Authorization', `Bearer ${token}`).send({ role: 'wizard' });
    expect(res.status).toBe(400);
  });
  test('admin cannot delete their own account (400)', async () => {
    const token = await adminToken(app);
    const me = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete(`/api/admin/users/${me.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
  test('admin can delete another user', async () => {
    const token = await adminToken(app);
    const r = await register(app, { email: 'deleteme@test.com' });
    const res = await request(app).delete(`/api/admin/users/${r.res.body.user.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
